import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { parseStringPromise } from "xml2js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API to fetch oil price from Taiwan CPC
  app.get("/api/oil-price", async (req, res) => {
    const requestedType = req.query.type as string || "超級柴油";
    
    // List of potential endpoints to try
    const endpoints = [
      {
        url: "https://www.cpc.com.tw/GetOilPriceJson.aspx",
        type: 'json'
      },
      {
        url: "https://api.cpc.com.tw/api/v1/oil/price/latest",
        type: 'json'
      }
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        console.log(`Attempting to fetch from: ${endpoint.url}`);
        const response = await fetch(endpoint.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://www.cpc.com.tw/'
          },
          signal: AbortSignal.timeout(5000) // 5 seconds timeout
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        let text = await response.text();
        if (!text || text.trim() === "") throw new Error("Empty response");

        // Handle Byte Order Mark (BOM)
        if (text.charCodeAt(0) === 0xFEFF) {
          text = text.slice(1);
        }

        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error(`JSON parse error from ${endpoint.url}. Text length: ${text.length}`);
          throw new Error("Invalid JSON format");
        }

        /**
         * CPC structure can vary between these endpoints.
         * The official site usually returns an array.
         * The api.cpc.com.tw might return { status: '...', data: [...] }
         */
        let items = Array.isArray(data) ? data : (data.data || []);
        
        const targetItem = items.find((item: any) => 
          item['產品名稱'] === requestedType || 
          item['產品'] === requestedType ||
          item['name'] === requestedType
        );
        
        if (!targetItem) {
          console.warn(`${requestedType} not found in ${endpoint.url}`);
          continue; // Try next endpoint
        }

        const priceStr = targetItem['參考零售價'] || targetItem['價格'] || targetItem['price'];
        const cpcPrice = parseFloat(priceStr);
        
        if (isNaN(cpcPrice)) throw new Error("Invalid price format");

        const isDiesel = requestedType.includes('柴油');
        const fpccPrice = isDiesel ? cpcPrice - 0.1 : cpcPrice;

        return res.json({
          success: true,
          data: {
            cpc: cpcPrice,
            fpcc: Number(fpccPrice.toFixed(1)),
            updatedAt: new Date().toISOString(),
            source: endpoint.url,
            fuelType: requestedType
          }
        });
      } catch (error) {
        console.error(`Error fetching from ${endpoint.url}:`, error instanceof Error ? error.message : String(error));
        lastError = error;
      }
    }

    // If all endpoints fail, return a fallback with error info
    console.warn("All oil price endpoints failed. Using fallback.");
    const defaultPrices: Record<string, number> = {
      '92無鉛汽油': 29.5,
      '95無鉛汽油': 31.0,
      '98無鉛汽油': 33.0,
      '超級柴油': 27.1
    };

    const cpcBase = defaultPrices[requestedType] || 30.0;
    const isDieselFallback = requestedType.includes('柴油');
    
    res.json({
      success: true,
      data: {
        cpc: cpcBase,
        fpcc: Number((isDieselFallback ? cpcBase - 0.1 : cpcBase).toFixed(1)),
        updatedAt: new Date().toISOString(),
        isFallback: true,
        error: lastError instanceof Error ? lastError.message : String(lastError),
        fuelType: requestedType
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
