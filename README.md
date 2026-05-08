<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AutoTrack Pro (Car-log)

這是一個以 React + Vite 開發的前端應用程式，並搭配 Express 提供後端 API 的車輛油耗與保養紀錄系統。

## 🚀 快速開始 (Run Locally)

**環境需求:** Node.js (建議 v20 以上)

1. **安裝依賴套件**:
   ```bash
   npm install
   ```
2. **設定環境變數** (若有需要):
   請參考 `.env.example`，將檔案複製為 `.env.local` 並填入對應的 API Key 等資訊：
   ```bash
   cp .env.example .env.local
   ```
3. **啟動本地端開發伺服器**:
   ```bash
   npm run dev
   ```
   啟動後，瀏覽器前往 `http://localhost:3000` 即可預覽。

---

## 📦 部署上線 (Deployment)

本專案已設定 GitHub Actions CI/CD 流程 (`.github/workflows/deploy.yml`)。

**部署流程：**
- 當您 push 程式碼到 `main` 分支時，GitHub Actions 會自動執行 `npm install` 與 `npm run build` 確認專案編譯無誤。
- **自動部署到雲端主機 (以 Render 或 Zeabur 為例)**：
  1. 在您的雲端服務平台（如 Render）建立一個 Web Service。
  2. 在平台的設定中找到 **Deploy Hook URL**。
  3. 到此 GitHub 專案的 `Settings` -> `Secrets and variables` -> `Actions`。
  4. 新增一個 Repository secret，名稱為 `DEPLOY_HOOK_URL`，值為您的 Deploy Hook 網址。
  5. 往後只要推上 `main` 分支，GitHub Action 就會自動觸發此 WebHook 來完成自動部署！

---

## 🛠️ 近期專案更新紀錄

- **優化 `package.json`**：設定了適合全端應用程式的啟動腳本 (`npm start` 會切換至 production 模式並啟動伺服器)，並修正了專案名稱。
- **加入自動部署設定**：新增了 `.github/workflows/deploy.yml` 作為 GitHub Actions 設定檔，實現 CI/CD 工作流。
- **完善 `.gitignore`**：過濾了 OS 系統快取檔 (如 `.DS_Store`)、IDE 設定檔 (如 `.vscode/`, `.idea/`) 以及本機 debug log 等不必要的開發檔案。
