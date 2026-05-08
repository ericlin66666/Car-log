import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import admin from "firebase-admin";

// 嘗試初始化 Firebase Admin
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT && !admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("🔥 Firebase Admin 初始化成功");
  } else {
    console.warn("⚠️ 尚未設定 FIREBASE_SERVICE_ACCOUNT 環境變數，Firebase 將不會啟動");
  }
} catch (error) {
  console.error("Firebase 初始化失敗:", error);
}

const db = admin.apps.length ? admin.firestore() : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 必須加入這一行才能解析 POST 的 JSON Body
  app.use(express.json());

  // ================= Firebase API =================
  // 取得使用者的所有紀錄
  app.get("/api/records", async (req, res) => {
    if (!db) return res.status(500).json({ success: false, error: "Firebase 尚未初始化" });
    try {
      const userId = req.query.userId || 'default_user';
      
      const fuelRef = await db.collection('users').doc(userId).collection('fuelRecords').get();
      const fuelRecords = fuelRef.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const maintRef = await db.collection('users').doc(userId).collection('maintenanceRecords').get();
      const maintenanceRecords = maintRef.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      res.json({ success: true, data: { fuelRecords, maintenanceRecords } });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 新增/更新加油紀錄
  app.post("/api/records/fuel", async (req, res) => {
    if (!db) return res.status(500).json({ success: false, error: "Firebase 尚未初始化" });
    try {
      const userId = req.body.userId || 'default_user';
      const record = req.body.record;
      if (!record || !record.id) return res.status(400).json({ error: "無效的紀錄" });
      
      await db.collection('users').doc(userId).collection('fuelRecords').doc(record.id).set(record);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 刪除加油紀錄
  app.delete("/api/records/fuel/:id", async (req, res) => {
    if (!db) return res.status(500).json({ success: false, error: "Firebase 尚未初始化" });
    try {
      const userId = req.query.userId || 'default_user';
      await db.collection('users').doc(userId).collection('fuelRecords').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  // ===============================================

  // API to fetch oil price from Taiwan CPC
  app.get("/api/oil-price", async (req, res) => {
    const requestedType = req.query.type || "超級柴油";
    
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
        
        const targetItem = items.find((item) => 
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
    const defaultPrices = {
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
