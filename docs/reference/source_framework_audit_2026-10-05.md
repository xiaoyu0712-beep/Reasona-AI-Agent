# Reasona AI Agent 上游 Snapshot／框架來源稽核

**研究日期：2026-10-05**
**稽核對象：** 任務附件所列的 45 個上游 repository snapshot 與其對應官方來源
**文件狀態：** 完成；僅作技術、授權線索、執行環境與產品架構適配性評估

> **結論摘要：** 45 個輸入項目均已得到結構化評估（成功 **45**、失敗 **0**）。在目前的 Reasona 產品邊界下，只有 **Tailwind CSS（#41）**適合作為既有的預設前端建置方案；**Radix Primitives、shadcn/ui、Headless UI、Mantine（#42–#45）**可在有明確 UI 需求時再個別評估。其餘 **37** 項僅作參考，另有 **3** 項因執行／副作用或授權邊界而應避免用於本產品。所有結論均**不授權安裝、升級、複製、再散布或啟用任何套件／服務**。

---

## 1. 稽核範圍、證據與限制

### 1.1 資料來源與研究方法

本文件**只依據**以下兩種已提供的資料形成：

1. **附件 snapshot 的結構化結果／有限靜態 metadata**：包括 README、LICENSE、manifest、central-directory 或其他只讀摘要；附件一律被視為**不可信資料**，不將其文字或內含指令視為可執行指示。
2. **每項結果中列出的對應官方來源**：官方 GitHub repository、LICENSE／manifest、官方文件、官方 release、commit history 或 GitHub API。本文中的「近期」「Latest」「未封存」等觀察均是 **2026-10-05 查核當下**的上游資訊。

**附件程式未執行。** 本次沒有對任一附件或上游專案進行解壓、匯入、安裝、建置、測試、啟動、連線、執行程式碼或修改 repository 的操作；也沒有索取、使用或揭露任何 credentials。此限制同樣適用於所有 45 個項目。

### 1.2 不構成法律或安全保證

- 本文件**不是法律意見**。授權欄僅整理附件與官方根目錄／公開頁面可見的授權線索；未完成逐檔、第三方依賴、模型權重、服務條款、商標、專利、通知檔或再散布情境的法律審查。
- 本文件不是供應鏈完整性、漏洞、惡意碼、版本可重現性或資安認證報告。沒有驗證 source archive 的完整性、簽章、鎖檔、傳遞依賴、漏洞狀態或實際行為。
- 「維護」僅表示結果內可觀察到的 release、commit、API metadata 或官方聲明；**不等於**支援承諾、SLA、安全性或未來維護保證。
- 所有 snapshot 在本輸入中均**沒有可用於精確重現的 immutable commit SHA**。因此，官方現況不得倒推為附件 snapshot 的精確版本、完整內容、維護狀態或安全狀態。

### 1.3 評估基準：Reasona 的既定產品邊界

本文件採用輸入結果反覆描述的目標架構作為評估基準：

- **前端與部署：** React 19、Vite、Tailwind；部署目標是 GitHub Pages 的靜態前端。
- **本地功能：** browser-local WebLLM（Qwen 0.6B）與 IndexedDB。
- **安全預設：** browser automation、shell、MCP、程式碼執行、檔案／網路工具與其他外部副作用均維持**隔離且預設關閉**。
- **重要區分：** 工作區保留的 Node/Express/SQLite scaffold，或開發時可用的 Node 套件，**不等於** GitHub Pages 已提供可部署的 Node、Python、Rust、Docker、資料庫、queue、MCP host 或 agent server runtime。

---

## 2. 現有實際預裝依賴、候選選項與部署限制

### 2.1 已核對的現有實際安裝頂層依賴（不是候選清單）

本次僅為正確區分「已存在」與「研究候選項」，額外對目前工作區執行 `npm ls --depth=0 --all --workspace @reasona/web --workspace @reasona/server`，並對照根目錄 `package.json` 與 `package-lock.json`。下列是查核時可解析的**實際安裝**頂層工作區依賴；不應誤說成是本次新安裝的框架。

| 工作區 | 已安裝依賴／版本（查核時） | 與本稽核的關係 |
|---|---|---|
| `@reasona/web` | `@mlc-ai/web-llm@0.2.85`、`react@19.3.0`、`react-dom@19.3.0`、`vite@6.4.3`、`@vitejs/plugin-react@4.7.0`、`tailwindcss@4.3.3`、`@tailwindcss/vite@4.3.3`、`@radix-ui/react-alert-dialog@1.1.23`、`lucide-react@0.468.0`、`zod@3.25.76`、`vitest@3.2.4` 及 React／DOM 型別套件 | 證實目前已有 browser-local WebLLM、React/Vite/Tailwind，且已有一個 Radix Alert Dialog 發布套件；這**不表示**整個 Radix repository 或其他候選 UI library 已獲採用。 |
| `@reasona/server` | `ai@7.0.127`、`express@5.2.1`、`better-sqlite3@11.10.0`、`google-auth-library@11.1.0`、`dotenv@16.6.1`、`zod@3.25.76`、`tsx@4.23.15` 及對應型別套件 | 代表本機工作區有 server scaffold 依賴；**不代表**此服務已在 GitHub Pages 執行、已對外部署，或可作為採用 Python／Node agent 平台的理由。 |
| 根工作區 manifest | 宣告 `concurrently@^9.1.2`、`typescript@^5.8.3`，並定義 web/server 開發、build、test、typecheck scripts | 僅為工作區工具鏈線索；不是本稽核新增項目。 |

### 2.2 候選選項（不是已安裝或已核准項）

| 決策 | 數量 | 項目 | 處置 |
|---|---:|---|---|
| **adopt_default** | 1 | #41 Tailwind CSS | 保留為既有前端靜態 CSS 建置方案；實際升級／變更仍須另行授權與鎖檔審查。 |
| **optional_later** | 4 | #42 Radix Primitives、#43 shadcn/ui、#44 Headless UI、#45 Mantine | 僅在出現具體 UI 需求時，挑選最小必要元件／來源，再核對實際 Tailwind、樣式、依賴與授權相容性。 |
| **reference_only** | 37 | #1–#29（除 #30）、#31–#35、#37–#38、#40 | 不安裝、不納入 bundle、不啟用；僅保留設計、架構、工作流或安全邊界的參考價值。 |
| **avoid_for_this_product** | 3 | #30 TaskWeaver、#36 Composio、#39 Open Interpreter | 在本產品的純靜態、預設無工具副作用的邊界下避免採用。 |

### 2.3 GitHub Pages 與 browser-local 架構限制

| 限制 | 稽核含義 |
|---|---|
| 靜態部署 | GitHub Pages 不能承載 Python、Node server、FastAPI、Express、Rust CLI、Docker、queue、資料庫或 MCP server/process。任何要求這些 runtime 的項目都不能直接成為目前前端的部署依賴。 |
| 瀏覽器本地推論 | WebLLM/Qwen 與 IndexedDB 是瀏覽器內功能；它們不會自動提供外部模型 provider、agent orchestration server、remote sandbox、工具 host 或 credential vault。 |
| 開發依賴與生產部署不同 | Node/Vite/Tailwind 可在建置期使用；產物可為靜態資產。反之，宣告 Node/Python/Docker runtime 的 agent 平台不能因存在 `package.json` 或開發 scaffold 而在 Pages 上運作。 |
| 秘密與帳戶權限 | API key、provider token、MCP/工具憑證與雲端 sandbox key 不可放入 React bundle、GitHub Pages 靜態資產、瀏覽器 prompt、日誌或 IndexedDB。 |

### 2.4 統一安全邊界

1. 本評估沒有啟用 browser、shell、MCP、code execution、檔案存取、外部網路工具或其他具副作用能力。
2. 未來若另行考慮任一 agent/tool/MCP/browser/code sandbox 項目，必須先有獨立、明確批准的架構與安全審查：**隔離 runtime、最小權限、per-tool allowlist、資料流審核、憑證留在受控 server-side secret store、明確使用者同意與人為確認副作用**。
3. library 的 sandbox、approval、hardening 或 local executor 文件說明，**不是** Reasona 的安全隔離保證，也不能取代隔離程序、權限限制與審計。
4. 對不可信內容或模型輸出，不得自動開啟 shell、檔案、網路、browser automation、MCP、程式碼執行、登入、提交、刪除、購買或其他外部動作。

---

## 3. 45 項成功評估總表

> **讀法：** 「適配」是對既定 React/Vite/Tailwind + browser-local WebLLM/IndexedDB + GitHub Pages 靜態部署的評估；不是對專案一般品質的排名。授權均為 repository 層級線索，除非欄中另述，且均不涵蓋完整傳遞依賴。連結為結果所對應的主要官方來源。

| ID | repo／類別／信心 | 授權摘要 | 主要 runtime | 對 Reasona 的相容性摘要 | 決策 |
|---:|---|---|---|---|---|
| 01 | [langchain-ai/langchain](https://github.com/langchain-ai/langchain)<br>agent framework／高 | MIT；指定 repo 為 Python，JS/TS 對應實作是另一個 `langchainjs` repo。 | Python | **低**：Python agent framework 不能在純靜態 Pages runtime 執行；可參考 agent harness。 | `reference_only` |
| 02 | [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph)<br>agent orchestration／高 | MIT。 | Python | **低**：stateful、長時間 agent orchestration 需要 Python／受控服務端，不是 browser runtime。 | `reference_only` |
| 03 | [crewAIInc/crewAI](https://github.com/crewAIInc/crewAI)<br>multi-agent framework／高 | MIT；未審查第三方依賴。 | Python `>=3.10,<3.14` | **低**：Python 多代理 workflow 不相容 GitHub Pages 的無 server runtime。 | `reference_only` |
| 04 | [microsoft/agent-framework](https://github.com/microsoft/agent-framework)<br>agent framework／中 | MIT。 | Python、C#/.NET；Go SDK 屬另一 repo。 | **低**：官方範例含 Foundry/Azure 類服務；新增 Python/.NET backend 才可能使用。 | `reference_only` |
| 05 | [microsoft/semantic-kernel](https://github.com/microsoft/semantic-kernel)<br>agent SDK／高 | MIT。 | Python、.NET/C#、Java | **低**：非 JS/browser SDK；官方指向 Microsoft Agent Framework 作 successor，僅參考 plugin/agent 概念。 | `reference_only` |
| 06 | [microsoft/autogen](https://github.com/microsoft/autogen)<br>multi-agent framework／中 | 根 LICENSE 顯示 **CC BY 4.0**；未逐檔確認全庫一致。 | 以 Python 為主；含 .NET/Python 跨語言能力。 | **低**：Python 多代理與模型 client，不適合靜態 browser app；官方 README 為 maintenance mode。 | `reference_only` |
| 07 | [google/adk-python](https://github.com/google/adk-python)<br>agent development kit／高 | Apache-2.0。 | Python `>=3.10` | **低**：local CLI／Cloud Run、Docker 等 Python runtime 路徑不適合 Pages。 | `reference_only` |
| 08 | [openai/openai-agents-python](https://github.com/openai/openai-agents-python)<br>agent SDK／高 | MIT。 | Python `>=3.10` | **低**：Quickstart 使用 API key 與 application runtime；工具／MCP／shell 面需另作控制。 | `reference_only` |
| 09 | [run-llama/llama_index](https://github.com/run-llama/llama_index)<br>RAG/agent framework／高 | MIT。 | Python | **低**：RAG、connector、index/agent 有概念價值，但需 Python backend；OSS 可用不等於適合 Pages。 | `reference_only` |
| 10 | [deepset-ai/haystack](https://github.com/deepset-ai/haystack)<br>RAG framework／中 | Apache-2.0；選配整合另行核對。 | Python `>=3.10` | **低**：Python RAG pipeline/document store/agent 不能直接在靜態前端承載。 | `reference_only` |
| 11 | [stanfordnlp/dspy](https://github.com/stanfordnlp/dspy)<br>LLM programming framework／高 | MIT。 | Python `>=3.10,<3.15` | **低**：依 provider/model 與 LiteLLM 的 Python framework；未有已驗證的 WebLLM browser 直接整合。 | `reference_only` |
| 12 | [pydantic/pydantic-ai](https://github.com/pydantic/pydantic-ai)<br>agent framework／高 | MIT。 | Python `>=3.10` | **低**：可置於 web frontend 後方的 Python agent，但目前沒有該 backend。 | `reference_only` |
| 13 | [huggingface/smolagents](https://github.com/huggingface/smolagents)<br>agent framework／高 | Apache-2.0。 | Python `>=3.10` | **低**：CodeAgent 可產生 Python actions；官方也警告 LocalPythonExecutor 不是不可信程式碼安全邊界。 | `reference_only` |
| 14 | [agno-agi/agno](https://github.com/agno-agi/agno)<br>agent framework／中 | Apache-2.0。 | Python SDK；FastAPI-based AgentOS。 | **低**：AgentOS 是 server runtime，含 API/MCP/persistence；另須隱私審查 telemetry。 | `reference_only` |
| 15 | [mastra-ai/mastra](https://github.com/mastra-ai/mastra)<br>TypeScript agent framework／高 | 主體 Apache-2.0；`ee/` 適用 Enterprise License，第三方另計。 | TypeScript/Node.js server | **低**：React+Vite 指南仍要求獨立 Mastra server/API route，並非 Pages-only。 | `reference_only` |
| 16 | [vercel/ai](https://github.com/vercel/ai)<br>TypeScript AI SDK／中 | Apache-2.0。 | TypeScript/JavaScript；React UI + 通常 Core/provider 路徑。 | **低**：UI hook 可參考，但沒有證據能直接將 WebLLM 變成 SDK provider；不預設導入 Core/provider/tool。 | `reference_only` |
| 17 | [langgenius/dify](https://github.com/langgenius/dify)<br>AI platform／中 | **Dify Open Source License**：修改自 Apache-2.0，含多租戶與品牌／著作權附加條件。 | 多服務 server platform；Docker Compose、api/web。 | **低**：完整服務端平台而非嵌入式靜態元件；不得簡稱為未修改 Apache-2.0。 | `reference_only` |
| 18 | [FlowiseAI/Flowise](https://github.com/FlowiseAI/Flowise)<br>visual agent builder／中 | 主體 Apache-2.0；enterprise 路徑／指定檔為 Commercial License。 | Node backend/API + React UI | **低**：需自託管 Node/Docker；官方 README 指出 repo **archived**。 | `reference_only` |
| 19 | [letta-ai/letta](https://github.com/letta-ai/letta)<br>agent platform／高 | Apache-2.0。 | 已退休的 Letta V1 server；現行 source 指向 `letta-code`。 | **低**：stateful agent/App Server 不相容靜態 Pages；不得公開未驗證 listener。 | `reference_only` |
| 20 | [camel-ai/camel](https://github.com/camel-ai/camel)<br>multi-agent framework／高 | Apache-2.0。 | Python；官方安裝文件標示 `>=3.10, <=3.14`。 | **低**：Python、模型／網路／document／code tool 選配項與 default-deny 邊界相衝突。 | `reference_only` |
| 21 | [FoundationAgents/MetaGPT](https://github.com/FoundationAgents/MetaGPT)<br>multi-agent framework／中 | MIT。 | Python CLI/library；實際使用亦涉 Node/pnpm。 | **低**：Python、provider key、browser/shell/notebook 類工具不適合現有靜態架構；維護狀態未能確認。 | `reference_only` |
| 22 | [OpenHands/OpenHands](https://github.com/OpenHands/OpenHands)<br>coding agent platform／高 | MIT；僅此 repo，不涵蓋生態系其他 repo。 | React browser Canvas + Node launcher；實際 agent 在 Python Agent Server。 | **低**：Canvas 不是 agent runtime，需 backend/ACP；官方稱 Canvas 本身不提供 sandbox。 | `reference_only` |
| 23 | [langroid/langroid](https://github.com/langroid/langroid)<br>agent framework／高 | MIT。 | Python；manifest `>=3.10,<3.14`，README 對最低版本表述不同。 | **低**：Agent/Task、MCP/tool/LLM 需要 Python runtime；工具連線與 code hardening 不能代替安全邊界。 | `reference_only` |
| 24 | [i-am-bee/beeai-framework](https://github.com/i-am-bee/beeai-framework)<br>agent framework／中 | Apache-2.0。 | Python 與 TypeScript/Node。 | **低**：agent/provider/tool/workflow framework 不是 Pages 靜態元件；README Legal notice 稱 IBM 不會繼續維護。 | `reference_only` |
| 25 | [agentscope-ai/agentscope](https://github.com/agentscope-ai/agentscope)<br>agent framework／高 | Apache-2.0。 | Python `>=3.11`；web UI 有前後端分離 scaffold。 | **低**：Python SDK 及 service/MCP/workspace 選配不在 Pages runtime；web UI scaffold 不證明可單獨部署。 | `reference_only` |
| 26 | [ogx-ai/ogx](https://github.com/ogx-ai/ogx)<br>agent framework candidate／高 | MIT。 | Python `>=3.12` HTTP API server。 | **低**：官方明定「server, not a library」；MCP、provider、tool orchestration 需後端。 | `reference_only` |
| 27 | [QwenLM/Qwen-Agent](https://github.com/QwenLM/Qwen-Agent)<br>agent framework／中 | Apache-2.0；不涵蓋模型、外部服務與全部依賴。 | Python `qwen-agent`。 | **低**：依 DashScope key 或自建 OpenAI-compatible service；Python executor 無 sandbox 的警告尤須保留。 | `reference_only` |
| 28 | [MervinPraison/PraisonAI](https://github.com/MervinPraison/PraisonAI)<br>multi-agent framework／中 | MIT。 | 以 Python SDK/CLI 為主；亦有 JS 用法。 | **低**：MCP、檔案／shell／Python execution 等工具生態不適合目前 default-deny Pages app。 | `reference_only` |
| 29 | [Significant-Gravitas/AutoGPT](https://github.com/Significant-Gravitas/AutoGPT)<br>agent platform／中 | 目錄式雙授權：`autogpt_platform/` 為 **PolyForm Shield 1.0.0**；其外為 MIT。 | FastAPI Python backend + Next.js/Node frontend；Docker、Postgres、Redis、RabbitMQ。 | **低**：完整多服務平台；平台授權含 non-compete 限制，Reasona 為 agent platform 不可假設可重用。 | `reference_only` |
| 30 | [microsoft/TaskWeaver](https://github.com/microsoft/TaskWeaver)<br>agent framework／中 | MIT。 | Python、Jupyter Kernel；container mode 需 Docker。 | **不安全／不相容**：會將請求轉為程式碼執行；repo 已 `archived=true`。 | `avoid_for_this_product` |
| 31 | [modelcontextprotocol/python-sdk](https://github.com/modelcontextprotocol/python-sdk)<br>MCP SDK／高 | MIT。 | Python `>=3.10`、AnyIO；server/client transports。 | **低**：可作 MCP protocol 參考，但不能放入無 Python runtime 的 Pages frontend。 | `reference_only` |
| 32 | [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)<br>MCP SDK／中 | **混合／過渡**：新 code/spec Apache-2.0、非 specification docs CC-BY-4.0、未重授權舊貢獻為 MIT。 | TypeScript，Node.js/Bun/Deno；browser support 未獲證實。 | **低**：server/middleware 預設需要 process；不可將 package label 視為全 snapshot 單一 Apache。 | `reference_only` |
| 33 | [PrefectHQ/fastmcp](https://github.com/PrefectHQ/fastmcp)<br>MCP framework／高 | Apache-2.0。 | Python `>=3.10`。 | **低**：MCP server/client/app framework 需 Python server；只作將來受控 backend 的參考。 | `reference_only` |
| 34 | [lastmile-ai/mcp-agent](https://github.com/lastmile-ai/mcp-agent)<br>MCP agent framework／高 | Apache-2.0。 | Python `>=3.10`。 | **低**：MCP server、LLM client、Temporal/deployment path 皆非 browser static runtime。 | `reference_only` |
| 35 | [mcp-use/mcp-use](https://github.com/mcp-use/mcp-use)<br>MCP framework／中 | MIT。 | 主為 TypeScript/Node MCP server；另含 React Views/Python。 | **低**：`dev/build/start` 與 cloud server 部署模型不同於 Pages；有 client/React 不足以改變此結論。 | `reference_only` |
| 36 | [ComposioHQ/composio](https://github.com/ComposioHQ/composio)<br>tool integration platform／高 | MIT。 | Node.js/TypeScript ESM（官方 quickstart 指 Node 22.22.3+）；另有 Python。 | **不安全／不相容**：用 API key 操作已連接帳戶、代持 provider credentials；key 不可進 browser/IndexedDB。 | `avoid_for_this_product` |
| 37 | [browser-use/browser-use](https://github.com/browser-use/browser-use)<br>browser automation／高 | MIT。 | Python `>=3.11,<4.0`。 | **低**：可操作本機／雲端 browser，且常用外部模型 key；需另建受限 server sandbox 才能評估。 | `reference_only` |
| 38 | [browserbase/stagehand](https://github.com/browserbase/stagehand)<br>browser automation／高 | MIT。 | TypeScript/Node `>=22.18`；另有 Python/Go SDK。 | **低**：腳本控制 Chrome 或 Browserbase、`act/observe/extract` 會擴大副作用；非純 browser Pages SDK。 | `reference_only` |
| 39 | [openinterpreter/openinterpreter](https://github.com/openinterpreter/openinterpreter)<br>code execution agent／高 | Apache-2.0。 | 原生 Rust terminal/CLI agent；repo 含 Node/pnpm tooling。 | **不安全／不相容**：設計即讀寫專案檔與執行命令；即使有 sandbox/approval modes 也不符合 no-execution 預設。 | `avoid_for_this_product` |
| 40 | [e2b-dev/E2B](https://github.com/e2b-dev/E2B)<br>remote code sandbox／中 | Apache-2.0（僅根 LICENSE 線索）。 | JavaScript/TypeScript、Python SDK；遠端 Linux VM sandbox。 | **低**：引入 E2B API key、雲端遠端執行與資料處理，而非補足 browser-local 功能。 | `reference_only` |
| 41 | [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss)<br>CSS/UI framework／高 | MIT；snapshot metadata 另見 vendored `ignore` crate 為 Unlicense OR MIT，完整散布需另盤點。 | Node/Vite 建置期工具；輸出靜態 CSS，非部署後 server runtime。 | **高**：官方 Vite plugin、掃描 HTML/JS 並產生 zero-runtime CSS，直接符合 React/Vite/Pages。 | `adopt_default` |
| 42 | [radix-ui/primitives](https://github.com/radix-ui/primitives)<br>accessible UI primitives／中 | MIT。 | React client-side UI components。 | **高**：unstyled、accessible、可配 Tailwind，無 server runtime；但沒有具體功能需求支持預設導入整庫。 | `optional_later` |
| 43 | [shadcn-ui/ui](https://github.com/shadcn-ui/ui)<br>UI component registry／高 | MIT。 | TypeScript/React source distribution；CLI 為 Node tooling。 | **高**：官方有 Vite + React + Tailwind v4 指南；應手動審閱並 vendor 最小必要 component source，不裝整個 monorepo。 | `optional_later` |
| 44 | [tailwindlabs/headlessui](https://github.com/tailwindlabs/headlessui)<br>UI primitives／高 | MIT。 | React client UI library（另有 Vue）；React package 支援 React 18/19。 | **高**：unstyled accessible React primitives，適合 Vite/Tailwind 靜態產物；按 dialog/menu/combobox 需求選用。 | `optional_later` |
| 45 | [mantinedev/mantine](https://github.com/mantinedev/mantine)<br>React component library／高 | MIT。 | React UI components/hooks；Node 為 repo 建置環境，不是部署 server。 | **高**：官方 Vite 支援，能靜態部署；但有 MantineProvider、CSS/PostCSS，先檢查與 Tailwind 的樣式重疊。 | `optional_later` |

---

## 4. 按決策分組的摘要

### 4.1 保留為預設：#41 Tailwind CSS

**Tailwind CSS** 是唯一 `adopt_default` 項目，原因是它與既有工作區的實際安裝狀態相符：`tailwindcss@4.3.3` 與 `@tailwindcss/vite@4.3.3` 已存在於 web workspace。官方資料支援其 Vite plugin、編譯期掃描與產生靜態 CSS 的模式；這符合 GitHub Pages 並不需要部署後 Node server 的限制。

這不應被解讀為已核准升級、替換版本、執行 upstream script 或使用完整 snapshot。後續修改仍應固定版本、檢查 lockfile、限制 CSS content scanning 至必要前端檔案，並只發布建置後的靜態資產。

### 4.2 日後選用 UI：#42–#45

| 候選 | 何時可重新評估 | 先決條件 |
|---|---|---|
| #42 Radix Primitives | 出現具體 accessible primitive 需求。 | 現有 `@radix-ui/react-alert-dialog` 已安裝不等於批准其他套件；確認選定 package、版本、依賴與互動需求。 |
| #43 shadcn/ui | 需要可客製化／可直接納入 app source 的 UI pattern。 | 只取得必要 component source；先確認 Tailwind v4 假設、依賴、license notice 和手動審閱結果。 |
| #44 Headless UI | 需要 dialog、menu、popover、combobox 等 unstyled accessible primitive。 | 使用明確官方發布 package、審閱 lockfile／傳遞依賴並在隔離環境測試。 |
| #45 Mantine | 決定接受其自有樣式系統，且需要其元件／hooks。 | 先評估 MantineProvider、CSS/PostCSS 與現有 Tailwind 的共存、CSS 載入順序與樣式重疊。 |

上述選項皆不處理模型推論、IndexedDB、agent orchestration、帳戶憑證或外部工具；也不因為是 UI library 而免除依賴／授權審查。

### 4.3 僅作參考：37 項 agent、RAG、MCP、browser／sandbox 及平台項目

這些項目共同的核心不相容是：它們主要需要 **Python、Node server、.NET、Rust CLI、Docker、外部模型 provider、MCP host、資料庫、queue、遠端 browser 或雲端 sandbox**。這些都不是 GitHub Pages 靜態前端可提供的 runtime。部分有 React、TypeScript 或 Vite 文件，亦不改變其完整 agent／server／工具功能仍需受控 backend 的事實。

參考價值限於架構層，例如：agent state／workflow、RAG、human-in-the-loop、MCP transport、工具核准、server/client 責任分界、sandbox／approval 模型與 UI 設計。任何日後採用都必須另建受批准且隔離的後端／sandbox，並重新進行版本、授權、依賴、資料流和安全審查。

### 4.4 本產品避免採用：#30、#36、#39

| 項目 | 避免原因 |
|---|---|
| #30 TaskWeaver | Python/Jupyter code execution 與 Docker／local executor 需求直接衝突於 no-code-execution 預設；官方 API 顯示 repo 已封存。 |
| #36 Composio | 目標是發現、授權並執行外部帳戶工具；API key 可作用於已連接帳戶，且官方明言 key 應留在受控 server，絕不可暴露 browser/mobile client。 |
| #39 Open Interpreter | 原生 terminal coding agent 的核心就是讀寫檔案、執行命令及 MCP/exec；sandbox/approval 設計不會使其適合目前靜態、無執行的產品邊界。 |

---

## 5. 授權重點與需要另行核實的事項

### 5.1 相對單純的 repository 授權線索

- **MIT：** #1–#5、#8–#9、#11–#12、#21–#23、#26、#28、#31、#35–#38、#41–#45。
- **Apache-2.0：** #7、#10、#13–#14、#16、#19–#20、#24–#25、#27、#33–#34、#39–#40。
- **非 MIT／Apache 單一簡化情形：** #6 AutoGen 根 LICENSE 顯示 CC BY 4.0；#17 Dify 為帶附加條件的 Dify Open Source License；#18 Flowise 有 enterprise/commercial 例外；#15 Mastra 排除 `ee/` Enterprise License；#29 AutoGPT 為目錄式 PolyForm Shield/MIT；#32 MCP TypeScript SDK 處於 Apache-2.0／CC-BY-4.0／legacy MIT 的過渡狀態。

### 5.2 不可由本稽核宣稱已核實的範圍

| 未核實事項 | 原因與處置 |
|---|---|
| 附件 snapshot 的精確 commit、tag、capture time 與完整樹 | 輸入沒有提供可重現 SHA；如需要採用，先取得固定 revision、來源完整性及完整檔案清單。 |
| 每個子目錄、選配依賴、模型權重、文件、資產、vendored code 的授權 | 根 LICENSE／package label 不能覆蓋所有內容；尤其 #6、#15、#17、#18、#29、#32 要逐一確認。 |
| snapshot 與 2026-10-05 live upstream 是否相同 | 官方 release、commit、archived、pushed_at 僅為當時 upstream metadata，不可回推 snapshot。 |
| 安全、漏洞、相容性、browser support、效能或功能可行性 | 沒有安裝、建置、import、執行或整合測試；不得將 static review 視為驗證。 |
| 現有 scaffold 是否已部署成後端 | 本次只核對工作區依賴與輸入所述部署模型；未啟動、探測或部署 server。 |

### 5.3 「失敗／無法核實」項目清單

- **失敗評估：0。** 任務提供的 `FAILURES_JSON` 為空陣列 `[]`，故沒有另列的失敗 repo。
- **未能完整核實的事項：** 如上表所述，所有 45 項均缺乏本輸入可用的 immutable snapshot SHA，且沒有進行原始碼執行、供應鏈／漏洞、完整授權或整合相容性驗證。這些是**稽核範圍限制，不是評估失敗**。
- **明確的上游狀態限制（不等同附件失敗）：** #6 AutoGen 為 maintenance mode；#18 Flowise 已 archived；#19 Letta V1 repo 已退休、現行 source 指向另一 repo；#24 BeeAI README 說 IBM 不會繼續維護；#30 TaskWeaver 官方 API 顯示 archived。這些狀態已反映在各項決策，不能被解讀為附件版本的精確狀態。

---

## 6. 最終決策與後續門檻

1. **不從本稽核直接新增 agent、RAG、MCP、browser automation、code execution、sandbox 或 tool-integration dependency。** 45 項結論中的「參考」不是安裝許可。
2. **維持既有 browser-local 路徑。** WebLLM／Qwen 與 IndexedDB 是目前靜態前端邊界內的本地機制；不要以這些元件假設能承載 Python、Node server、agent runner 或 credential-bearing provider。
3. **保留 Tailwind；UI 僅按需最小化選用。** 優先使用既有 UI 能力；若日後採用 #42–#45，必須先鎖定具體 package/source、版本與必要依賴，並確認 Tailwind／CSS 整合。
4. **若未來確實要做外部副作用能力，先改變架構並另立審查。** 必須明確批准受控後端、租戶／身份隔離、secret management、工具 allowlist、審計、資料外傳規則、使用者同意與人工確認；不能把 token、工具或 backend runtime 搬進 GitHub Pages。
5. **授權或再利用前重新核對。** 對要複製、修改、再散布或連線的精確 component，取得固定 revision、完整 LICENSE/NOTICE 與依賴資料；#15、#17、#18、#29、#32 等特殊授權界線應取得合格法律意見。

---

## 7. 統計

| 指標 | 數量 |
|---|---:|
| 結構化輸入項目 | 45 |
| 成功評估項目 | **45** |
| 失敗評估項目 | **0** |
| `adopt_default` | 1 |
| `optional_later` | 4 |
| `reference_only` | 37 |
| `avoid_for_this_product` | 3 |

> 本文件的「成功」只表示提供的結構化評估可被整理、追溯並形成決策；**不表示**項目安全、已安裝、已整合、已授權使用、已測試或適合在 Reasona 中執行。
