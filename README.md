# Reasona AI Agent

Reasona 是一個**尚待使用者與市場驗證**的來源密集研究工作台原型。附件中的模型、框架與流程文件是候選參考，不是已驗證市場事實、模型品質保證或最終架構決定。

> **目前公開網站是靜態前端，AI 推理選項在瀏覽器本機執行。**GitHub Pages 不提供本專案的 Node API、SQLite、Google 登入、排程、server-side runner 或網路來源檢索。使用者必須自行點選載入模型；沒有 WebGPU 時不會退回雲端服務。

## 工作台與安全邊界

- 黑／白／灰、高對比圓角玻璃 UI；使用新附件提供的 12 張 PNG；支援鍵盤焦點、長文閱讀、窄螢幕及 `prefers-reduced-motion`。
- 對話、個人 Agent、任務、群聊訊息、來源片段、claims、任務事件及稽核 metadata 存在**目前瀏覽器 IndexedDB**。不同對話以 ID 隔離；沒有雲端同步或登入。新任務會保存所選 Agent 設定快照。
- 任務狀態使用 `queued`、`running`、`waiting for user`、`completed`、`failed`、`cancelled`。任務階段來自實際本機模型步驟；不顯示虛構百分比或預製代理回報。
- Planner、Researcher、Reviewer 是**同一個本機模型依序生成的角色視角**，不是三個獨立 agent process、容器或不同模型。群聊內容只在模型實際返回後記錄。可取消生成；異常會顯示錯誤與任務事件。
- 網路搜尋和網址擷取未接通。使用者要先手動閱讀來源、貼入原文片段與 URL；每個非不確定性候選 claim 都要附上存在的 evidence ID，並由使用者開啟原文逐項核對。Schema 驗證能阻擋不存在的 evidence ID，**不能證明文字在語義上受來源支持**。未核對的模型主張都清楚標為候選。
- 空來源情況不會用模型記憶補成研究事實；模型輸出格式錯誤或 evidence ID 無效時，不會建立 claim，而是停在 `waiting for user`。
- 對話、Agent 與 Reasona IndexedDB 工作區資料的刪除都會先說明範圍並要求確認；清除工作區不會刪除瀏覽器 Cache API 中的模型權重，需從瀏覽器網站資料設定另行清除。沒有分享、公開發布、付款或其他外部工具執行器；外部操作目前不可能從此頁發生。稽核記錄只存動作 metadata，不複製對話正文。
- 排程目前是空狀態；沒有 scheduler/worker。Google OAuth 只有未部署的 server-side 安全佔位，沒有建立 OAuth client、同意畫面或正式登入。

## 本機模型候選（明確點選才載入）

工作台整合 `@mlc-ai/web-llm` 作為**瀏覽器端 runtime**，候選模型為 `Qwen3-0.6B-q4f16_1-MLC`。這不是下載進 GitHub Pages 或 repository：使用者按「載入本機模型」後才會從固定的 Hugging Face revision 下載約 **351,517,143 bytes（約 335 MiB）**權重，並載入 WebLLM runtime 的模型 WebGPU library。模型在相容瀏覽器的 GPU 上推理；WebLLM 型錄估算約 **1.4 GiB VRAM**，實際需求依瀏覽器、GPU、驅動與可用記憶體而異。瀏覽器 Cache API 可快取模型檔案。

- 必須使用 HTTPS（GitHub Pages 符合 secure-context 條件）、具 WebGPU 支援的瀏覽器及相容 GPU。若不支援，模型載入與研究執行會保持停用。
- 對話提示與推理內容留在本機瀏覽器，不傳到模型 API；模型權重／library 資產仍須透過 Hugging Face 與 WebLLM 上游檔案服務下載。首次載入可能耗時並使用數百 MiB 網路流量。
- Qwen3 base model card 標示 Apache-2.0；目前 MLC 量化權重 repository 本身未提供獨立 license metadata。Reasona 不重新散布權重；正式或商業用途前須另行確認衍生權重授權和使用政策。0.6B 小模型的研究品質尚未在真實硬體或代表性任務上評測。
- Sandbox 本次沒有 NVIDIA GPU/WebGPU 瀏覽器實測，故**無法宣稱模型已成功載入或實際推理已端到端驗證**。網頁的 WebGPU gate 與 model adapter 可建置、可測試；實際推理須在相容使用者裝置驗證。

來源： [Qwen3-0.6B base model card](https://huggingface.co/Qwen/Qwen3-0.6B) · [MLC 量化模型 revision `8c14ce481d4c692769976ad52afea453a102df19`](https://huggingface.co/mlc-ai/Qwen3-0.6B-q4f16_1-MLC/tree/8c14ce481d4c692769976ad52afea453a102df19) · [固定 commit 的 MLC WebGPU library `025bcaf3780fa8254f5e5efd3bfea0a5397248f4`](https://github.com/mlc-ai/binary-mlc-llm-libs/tree/025bcaf3780fa8254f5e5efd3bfea0a5397248f4) · [WebLLM 文件](https://webllm.mlc.ai/docs/user/basic_usage.html) · [WebGPU secure-context／支援狀態](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)。

## Repository 內實際預設安裝項目

以 `npm ci` 依 `package-lock.json` 安裝。以下列出直接 dependencies；有版本範圍者，以 lockfile 的 resolved version 為準。

| 分類 | 已安裝套件 | 實際狀態 |
|---|---|---|
| 瀏覽器模型 | `@mlc-ai/web-llm@0.2.85` | 按使用者操作載入本機 Qwen3 MLC 模型；不含權重、不呼叫付費 API。 |
| UI／確認 | `react@^19.1.0`、`react-dom@^19.1.0`、`vite@^6.3.5`、`tailwindcss@4.3.3`、`@tailwindcss/vite@4.3.3`、`@radix-ui/react-alert-dialog@1.1.23`、`lucide-react@^0.468.0` | React/Vite UI；Radix AlertDialog 用於刪除確認。沒有安裝 shadcn/ui、Headless UI 或 Mantine。 |
| Node API 基礎 | `express@^5.1.0`、`zod@^3.25.28`、`better-sqlite3@11.10.0`、`google-auth-library@11.1.0`、`dotenv@^16.5.0` | 只有保留的 server workspace scaffold；**未部署到 Pages，靜態前端沒有呼叫這些 API**。 |
| Agent SDK 候選 | `ai@7.0.127` | 安裝在 server workspace，尚未接入研究流程或 provider 呼叫。 |
| 測試／開發 | `vitest@3.2.4`、TypeScript、`tsx`、`concurrently` 及其型別套件 | 對狀態／evidence parser、server 安全邏輯提供測試和建置。 |

以上不代表全部功能已接通。**沒有**預裝其他 Agent framework（LangGraph、CrewAI、PydanticAI 等）、MCP SDK/server、外部 provider SDK/key、Browser Use、shell、任意程式碼執行、E2B、雲端 sandbox、向量資料庫或付款插件。50 個分類候選收錄在參考文件，不是套件安裝清單。對瀏覽器、shell、MCP、程式碼執行、檔案系統或外部副作用工具，預設沒有存取權；將來接入時須隔離、逐項白名單、明確授權並對重要動作確認。

## 本機開發與測試

需求：Node.js 22+、npm。

```bash
npm ci
cp .env.example .env
npm run dev
```

- 本機 Vite UI：<http://127.0.0.1:5173>
- API health scaffold：<http://127.0.0.1:4000/api/health>
- SQLite 預設檔案：`apps/server/data/reasona.sqlite`
- 預設 server host 僅 loopback；`AUTH_MODE=local` 只供本機開發。靜態 UI 使用 IndexedDB 和本機 WebGPU 模型，不連結 server API。

完整驗證：

```bash
npm ci
npm run typecheck
npm test
npm run build
```

本機預覽 Pages production 前端：

```bash
npm run build --workspace @reasona/web
npm run preview --workspace @reasona/web -- --port 4173
```

Vite preview 的專案路徑為 `/Reasona-AI-Agent/`。模型下載仍需使用者在頁面明確點選。

## GitHub Pages 部署

`.github/workflows/deploy-pages.yml` 在 `main` 更新或手動觸發時執行 `npm ci`、typecheck、server 與 web tests、production build、前端 token-pattern guard，並只上傳 `apps/web/dist`。不部署 `apps/server`、SQLite、`.env` 或任何 secrets。GitHub Pages 僅供靜態前端，不可將本網站描述為雲端 Agent/API 服務。

公開 URL（需由 repository Pages Actions 啟用）：<https://xiaoyu0712-beep.github.io/Reasona-AI-Agent/>。

## Server 設定、安全佔位與未接通功能

- `.env.example` 只有空白／安全範例。`MODEL_PROVIDER=none` 及 `RESEARCH_EXECUTION_ENABLED=false` 是預設值。server adapter 只有在使用者自行提供 server-only provider URL/model/key 並明確啟用後才可能呼叫；**靜態前端沒有連至該 adapter**，亦未因此驗證研究執行。
- Google OAuth 的 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、redirect URI、`SESSION_SECRET` 只作設定佔位。沒有假稱已建立 Google Cloud client 或取得登入同意。secret 不可放在 frontend、Pages artifact 或 Git。
- 還未接通：網路 source search/fetch/snapshot、發布或檢索工具、可信引用語義檢查、獨立代理 runtime/worker、API-backed UI sync、雲端 SQLite、排程、Google OAuth provider setup 和外部副作用工具。沒有這些能力就不會偽造搜尋結果、來源、代理執行回報或進度。

## 參考文件與素材

`docs/reference/` 保存四份模型／技術／Agent 生態／研究流程文件、使用者新附件 `frameworks_30_5_15.md`、來源封包 README、SHA-256 清單、素材 manifest 與 [45 項上游 snapshot 逐項稽核](docs/reference/source_framework_audit_2026-10-05.md)。附件候選列表含 30 個 Agent 框架、5 個分派框架及 15 個工具框架，另列 UI 候選；**本專案只保留少數相容元件，不把 50 個候選一併安裝或宣稱可用**。45 個上游 repository ZIP 在隔離目錄進行靜態 metadata 盤點；沒有解壓、安裝或執行其專案原始碼，也沒有把大型 ZIP 放入 Git。稽核僅提供技術與授權線索，不是法律或安全保證，亦不授權安裝或啟用候選。12 張附件 PNG 在 `apps/web/public/assets/reasona/`，並以原始 SHA-256 與附件核對一致。
