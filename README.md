# Reasona AI Agent

Reasona 是一個**尚待使用者與市場驗證**的來源密集研究／短報告多代理工作流原型。模型與流程附件只作研究參考；不構成已驗證的市場事實、模型選定、效能保證或使用者需求證據。

> **公開 GitHub Pages 目前只部署靜態前端。**沒有 SQLite、API、Google 登入、來源擷取或 AI runner。輸入、對話、Agent、核准和刪除操作在公開頁面停用；頁面不會儲存輸入、呼叫模型或生成示範性答案。

## 公開預覽

<https://xiaoyu0712-beep.github.io/Reasona-AI-Agent/>

GitHub Actions 只把 `apps/web/dist` 發佈到 Pages；不會部署 Node server 或 SQLite。即使頁面上的視覺展示 12 張素材，角色與流程插圖也**不代表即時任務進度或真的代理活動**。

## 已實作的工作區／後端程式碼（尚未部署）

- React 19、TypeScript、Vite 研究工作台；黑白灰圓角玻璃風格、窄螢幕排版、鍵盤焦點與 reduced-motion。
- Express 5 TypeScript API、SQLite schema 與 owner-scoped 對話、Agent、任務、子任務、來源、evidence、claim、approval、事件與稽核資料。
- 真實狀態採 `queued`、`running`、`waiting for user`、`completed`、`failed`、`cancelled`。目前無 runner；任務不能偽裝為 `running`，前端不顯示假百分比。
- 每個任務可保留建立時的個人 Agent 版本快照；群聊只顯示實際持久化訊息，沒有模型時不會產生假代理回報。
- Claim 可連到具體來源 URL 與人工提供的 evidence span；區分來源直接支持、跨來源綜合、不確定性／證據缺口。新增資料預設未經核查，僅登錄 URL 不等於來源已支持 claim。
- 外部操作 approval 顯示精確動作、payload、SHA-256 與期限；核准／拒絕要求明確確認並留 audit event。此版沒有外部執行器，核准不會寄送、發布或改變外部狀態。對話刪除會先展示完整資料範圍並要求確認。
- 稽核紀錄與 owner isolation 在 API/database 層實作；Google OIDC 僅為 server-side 安全邊界與環境佔位，沒有建立 Google Cloud OAuth 用戶端、同意畫面或真實登入。

## 安裝狀態：預設套件、選用項目與未接通能力

`npm ci` 依 `package-lock.json` 安裝此專案的鎖定依賴。與附件候選清單不同，**不會安裝 30+ 個 Agent 框架或 20 個以上工具整合**。

| 分類 | Repository 內預設安裝 | 實際狀態 |
|---|---|---|
| Agent runtime | Vercel AI SDK `ai@7.0.127`（Apache-2.0；符合附件對 TypeScript/Node 的單一 runtime 建議） | 已安裝於 server workspace，**目前未接入呼叫流程**；沒有 model/provider SDK、API key 或模型呼叫。套件安裝本身不連外呼叫服務。 |
| Server/API | Express 5、Zod、`better-sqlite3@11.10.0`、dotenv、`google-auth-library@11.1.0` | 已安裝；僅有未部署的本機 API/OAuth 邊界及資料 schema，不代表雲端 API 或正式認證已啟用。 |
| Web | React、React DOM、Vite、Lucide React | 已安裝；靜態建置僅公開 UI 與 PNG 素材。 |
| 開發／測試 | TypeScript、tsx、concurrently 與型別套件 | 已安裝於相應 workspace；完整清單及鎖定版本以各 `package.json`、lockfile 為準。 |

MCP SDK、其他 Agent runtime（例如 LangGraph、PydanticAI、AutoGen）、模型 provider SDK、瀏覽器自動化、shell、任意程式碼執行、向量資料庫、E2B/雲端 sandbox 與外部副作用工具**未預裝、未連接、未獲授權**。候選清單只列在 `docs/reference/`。若日後加入工具，須逐項設定白名單與權限，對瀏覽器、shell、MCP、程式碼執行、檔案存取和外部副作用採隔離、最小權限並要求適當的人為授權。

## 本機開發（非公開 Pages 網站的 server）

需求為 Node.js 22+ 與 npm。從 repository 根目錄：

```bash
npm ci
cp .env.example .env
npm run dev
```

前端開發伺服器位於 <http://127.0.0.1:5173>，API health 位於 <http://127.0.0.1:4000/api/health>。SQLite 預設位於 server workspace 的 `apps/server/data/reasona.sqlite`。API 僅綁定 loopback；`AUTH_MODE=local` 只供本機開發，絕不可直接暴露至網路或正式環境。

本機檢查：

```bash
npm run typecheck
npm test
npm run build
```

如只要建置無後端的靜態預覽，可在 repository 根目錄執行：

```bash
VITE_STATIC_PREVIEW=true npm run build --workspace @reasona/web
npm run preview --workspace @reasona/web
```

本機 preview URL 為 <http://127.0.0.1:4173/Reasona-AI-Agent/>；GitHub Pages workflow 也以靜態預覽模式建置。

## GitHub Pages 免費部署流程

`.github/workflows/deploy-pages.yml` 在 `main` 更新或手動觸發時會執行 `npm ci`、前後端 typecheck、測試、production build 及前端 bundle token-pattern guard；然後只上傳 `apps/web/dist`。此網站不包含 `.env`，也不從 GitHub Secrets 注入 API key。Pages URL：<https://xiaoyu0712-beep.github.io/Reasona-AI-Agent/>。

GitHub Pages 是靜態網站託管，不提供 SQLite/API/排程/worker；要讓後端成為服務，需另行選擇、審查與明確授權一個 server hosting 環境。**本次不部署後端，也不連接別的託管平台。**

## Google OAuth（安全佔位，尚未設定）

只有在使用者自行建立並核准 Google OAuth/OIDC 用戶端後，才可把 client ID、client secret 和精確 redirect URI 放到未提交的本機 `.env` 或核准部署平台的 server-only secret store。環境佔位名稱為 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`GOOGLE_REDIRECT_URI`、`APP_ORIGIN`；還需要 `AUTH_MODE=google` 及 `SESSION_SECRET`。請先設定 redirect URI、consent screen、測試使用者和 HTTPS/cookie/proxy 行為。不得把 OAuth secret 放入前端、Git、Pages workflow 或聊天。此 repository 沒有 Google 同意、登入或雲端 OAuth 設定。

## Model/provider（沒有預設模型）

附件模型比較與權重授權只供後續決策；目前尚無模型、API key、GPU、預算或 provider 授權。`.env.example` 將 `MODEL_PROVIDER=none`、研究執行停用。沒有自動付費 API fallback，也不會下載大型模型或購買資源。

即使自行設定 server-side OpenAI-compatible adapter 的 URL/model/key，現有版本也**不會因此執行研究任務**：尚缺核准的模型選擇、source search/fetch/snapshot、來源 freshness 與衝突檢查、claim-evidence verifier、Agent planner/runner、持久工作佇列、工具沙箱和評測。不要單獨打開 feature flag 後把輸出當成已查證研究。金鑰只由 server process 讀取，永不進入 browser bundle。

## 參考文件與視覺素材

`docs/reference/` 保存使用者提供的開源 Agent／模型／技術／研究流程文件、`frameworks_30_5_15.md` 候選清單與 PNG manifest。這些文件包含日期、官方來源連結及安裝建議，使用前仍需回原始官方來源核驗；**沒有做市場研究或把候選視為已選型**。12 張新 PNG 位於 `apps/web/public/assets/reasona/`，以素材牆及角色／空狀態插圖顯示；manifest 說明其生成來源，草稿尚非品牌核准。

## 目前明確未接通

真實 AI runner、主 Agent 任務規劃與子代理分派／協作、來源網路搜尋／下載／擷取、報告自動撰寫、模型供應商、排程執行器、持久雲端 API/SQLite、Google OAuth、MCP／browser／shell／code execution、通知／發布／付款外部工具，皆未設定或部署。AI、引用和進度均不會造假。
