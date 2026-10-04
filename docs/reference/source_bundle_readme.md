# Reasona Frameworks、UI 與工具整合來源封裝

核驗日期：**2026-10-04**（GitHub 官方 repository API/頁面；下載為該時點預設分支 snapshot）。
本包只收錄公開 GitHub source archive ZIP 原檔及 Reasona 視覺參考 PNG；不安裝套件、不解開或執行 repository 程式碼、不修改任何 GitHub repository。

## 包含內容
- 原始分類清單：**50 個分類條目**（Agent 30、子代理 dispatcher 5、工具／插件 15）；重複條目保留並逐列映射至同一份 canonical repo ZIP。
- 原清單去重後：**40 個 canonical repository ZIP**；React UI：**5 個官方 repository ZIP**；ZIP 成功下載 **45/45**。
- ZIP 下載總量：**1,930,656,794 B (1841.22 MiB)**；PNG 素材：**12 張，37,484,026 B (35.75 MiB)**。
- 附件：`reference/frameworks_30_5_15.md`、`reference/asset_manifest.md`、`assets/` 內 PNG、`SHA256SUMS.txt`。
- **未包含後端模型權重或模型套件**；本次只按清單下載程式框架/UI 工具的 GitHub source archive，不下載模型供應商權重、checkpoint 或模型包；45 個 ZIP 的目錄索引未發現常見權重副檔名項目。
- 每份 GitHub ZIP 保持下載位元組原樣收進 7z；未解開至檔案系統，僅對 ZIP 檔案目錄/CRC 作完整性檢查；README 表列其下載大小與 SHA-256。

## 50 個分類條目與 ZIP 映射
表內 A/B/C 對應原清單三個章節；同一 canonical repo 在不同章節重複出現時保留各列，並指向相同 ZIP ID。

| # | 類別 | 清單條目 | Canonical GitHub repo | ZIP 檔 |
|---:|:---:|---|---|---|
| 1 | A | Agent 框架｜LangChain | `langchain-ai/langchain` | `01_langchain-ai__langchain.zip` |
| 2 | A | Agent 編排／state graph｜LangGraph | `langchain-ai/langgraph` | `02_langchain-ai__langgraph.zip` |
| 3 | A | Agent 團隊／流程｜CrewAI | `crewAIInc/crewAI` | `03_crewAIInc__crewAI.zip` |
| 4 | A | Agent／workflow runtime｜Microsoft Agent Framework | `microsoft/agent-framework` | `04_microsoft__agent-framework.zip` |
| 5 | A | AI middleware／agent｜Semantic Kernel | `microsoft/semantic-kernel` | `05_microsoft__semantic-kernel.zip` |
| 6 | A | 多代理對話｜AutoGen（維護模式） | `microsoft/autogen` | `06_microsoft__autogen.zip` |
| 7 | A | Agent／子代理框架｜Google ADK | `google/adk-python` | `07_google__adk-python.zip` |
| 8 | A | Agent runtime｜OpenAI Agents SDK | `openai/openai-agents-python` | `08_openai__openai-agents-python.zip` |
| 9 | A | 資料／agent workflow｜LlamaIndex | `run-llama/llama_index` | `09_run-llama__llama_index.zip` |
| 10 | A | Pipeline／agent｜Haystack | `deepset-ai/haystack` | `10_deepset-ai__haystack.zip` |
| 11 | A | LLM 程式／agent 組件｜DSPy | `stanfordnlp/dspy` | `11_stanfordnlp__dspy.zip` |
| 12 | A | 型別化 Agent｜PydanticAI | `pydantic/pydantic-ai` | `12_pydantic__pydantic-ai.zip` |
| 13 | A | 輕量 agent／code tool｜smolagents | `huggingface/smolagents` | `13_huggingface__smolagents.zip` |
| 14 | A | Agent SDK／runtime｜Agno | `agno-agi/agno` | `14_agno-agi__agno.zip` |
| 15 | A | Agent／workflow｜Mastra | `mastra-ai/mastra` | `15_mastra-ai__mastra.zip` |
| 16 | A | Web agent／tool loop｜Vercel AI SDK | `vercel/ai` | `16_vercel__ai.zip` |
| 17 | A | 可視化 AI workflow｜Dify | `langgenius/dify` | `17_langgenius__dify.zip` |
| 18 | A | 可視化 workflow｜Flowise（封存） | `FlowiseAI/Flowise` | `18_FlowiseAI__Flowise.zip` |
| 19 | A | Stateful agent server｜Letta | `letta-ai/letta` | `19_letta-ai__letta.zip` |
| 20 | A | 多代理 workforce｜CAMEL-AI | `camel-ai/camel` | `20_camel-ai__camel.zip` |
| 21 | A | 多代理軟體工作流｜MetaGPT | `FoundationAgents/MetaGPT` | `21_FoundationAgents__MetaGPT.zip` |
| 22 | A | Coding agent｜OpenHands | `OpenHands/OpenHands` | `22_OpenHands__OpenHands.zip` |
| 23 | A | 多代理任務路由｜Langroid | `langroid/langroid` | `23_langroid__langroid.zip` |
| 24 | A | 多語言 agent framework｜BeeAI Framework | `i-am-bee/beeai-framework` | `24_i-am-bee__beeai-framework.zip` |
| 25 | A | Agent／子代理 framework｜AgentScope（新增） | `agentscope-ai/agentscope` | `25_agentscope-ai__agentscope.zip` |
| 26 | A | LLM API／tool orchestration｜Llama Stack → OGX（redirected） | `ogx-ai/ogx` | `26_ogx-ai__ogx.zip` |
| 27 | A | 工具代理／多代理｜Qwen-Agent（新增） | `QwenLM/Qwen-Agent` | `27_QwenLM__Qwen-Agent.zip` |
| 28 | A | Agent orchestration｜PraisonAI（新增） | `MervinPraison/PraisonAI` | `28_MervinPraison__PraisonAI.zip` |
| 29 | A | Agent 平台／workflow｜AutoGPT Platform（新增） | `Significant-Gravitas/AutoGPT` | `29_Significant-Gravitas__AutoGPT.zip` |
| 30 | A | Agent/workflow framework｜TaskWeaver（新增；已封存） | `microsoft/TaskWeaver` | `30_microsoft__TaskWeaver.zip` |
| 31 | B | Dispatcher／stateful graph｜LangGraph | `langchain-ai/langgraph` | `02_langchain-ai__langgraph.zip` |
| 32 | B | Dispatcher／role crew｜CrewAI | `crewAIInc/crewAI` | `03_crewAIInc__crewAI.zip` |
| 33 | B | Dispatcher／multi-agent workflow｜Microsoft Agent Framework | `microsoft/agent-framework` | `04_microsoft__agent-framework.zip` |
| 34 | B | Dispatcher／子代理框架｜Google ADK | `google/adk-python` | `07_google__adk-python.zip` |
| 35 | B | Dispatcher／experimental team pipeline｜AgentScope | `agentscope-ai/agentscope` | `25_agentscope-ai__agentscope.zip` |
| 36 | C | Agent 工具 harness｜LangChain（跨類重複） | `langchain-ai/langchain` | `01_langchain-ai__langchain.zip` |
| 37 | C | Plugin/function calling｜Semantic Kernel（跨類重複） | `microsoft/semantic-kernel` | `05_microsoft__semantic-kernel.zip` |
| 38 | C | 型別工具／MCP｜PydanticAI（跨類重複） | `pydantic/pydantic-ai` | `12_pydantic__pydantic-ai.zip` |
| 39 | C | Tool/code agent｜smolagents（跨類重複） | `huggingface/smolagents` | `13_huggingface__smolagents.zip` |
| 40 | C | Function tools／MCP｜OpenAI Agents SDK（跨類重複） | `openai/openai-agents-python` | `08_openai__openai-agents-python.zip` |
| 41 | C | 協定 SDK｜MCP Python SDK | `modelcontextprotocol/python-sdk` | `31_modelcontextprotocol__python-sdk.zip` |
| 42 | C | 協定 SDK｜MCP TypeScript SDK | `modelcontextprotocol/typescript-sdk` | `32_modelcontextprotocol__typescript-sdk.zip` |
| 43 | C | MCP server/client framework｜FastMCP | `PrefectHQ/fastmcp` | `33_PrefectHQ__fastmcp.zip` |
| 44 | C | MCP orchestration／agent｜MCP-Agent | `lastmile-ai/mcp-agent` | `34_lastmile-ai__mcp-agent.zip` |
| 45 | C | MCP agent/client｜mcp-use | `mcp-use/mcp-use` | `35_mcp-use__mcp-use.zip` |
| 46 | C | 外部 app connector｜Composio | `ComposioHQ/composio` | `36_ComposioHQ__composio.zip` |
| 47 | C | 瀏覽器 agent/tool｜Browser Use | `browser-use/browser-use` | `37_browser-use__browser-use.zip` |
| 48 | C | Browser automation SDK｜Stagehand | `browserbase/stagehand` | `38_browserbase__stagehand.zip` |
| 49 | C | 本機 shell/code/browser agent｜Open Interpreter | `openinterpreter/openinterpreter` | `39_openinterpreter__openinterpreter.zip` |
| 50 | C | 雲端隔離 code execution｜E2B Code Interpreter | `e2b-dev/E2B` | `40_e2b-dev__E2B.zip` |

## 5 個 React UI／component 候選 ZIP
按 React 相容性、黑白灰與玻璃視覺的客製自由度、無障礙元件基礎及官方來源狀態選定。這些是可比較/組合的不同層級，不代表需要同時安裝。

| 項目 | 技術角色與採用理由 | 官方 repo | 預設分支 | 授權/授權說明 | 維護訊號 | ZIP |
|---|---|---|---|---|---|---|
| Tailwind CSS | 原子化 CSS 樣式基礎，可自訂黑白灰色彩、圓角、陰影與間距 token；不自帶 React 元件視覺系統。 | [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`； 官方授權來源：[LICENSE/授權](https://raw.githubusercontent.com/tailwindlabs/tailwindcss/main/LICENSE) | 未封存；最近推送 `2026-09-25` | `41_tailwindlabs__tailwindcss.zip` · 1,261,270 B (1.20 MiB) |
| Radix UI Primitives | 低階 React primitives，提供鍵盤、ARIA 與焦點管理等互動基礎，不綁定視覺主題，方便客製玻璃效果與圓角。 | [radix-ui/primitives](https://github.com/radix-ui/primitives) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`； 官方授權來源：[LICENSE/授權](https://github.com/radix-ui/primitives/blob/main/LICENSE) | 未封存；最近推送 `2026-08-08` | `42_radix-ui__primitives.zip` · 1,454,319 B (1.39 MiB) |
| shadcn/ui | 可複製並直接修改的 React 元件樣板，以 Tailwind 與可及性元件模式為基礎，方便統一黑白灰和大圓角 token。 | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`； 官方授權來源：[LICENSE/授權](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md) | 未封存；最近推送 `2026-10-02` | `43_shadcn-ui__ui.zip` · 24,598,622 B (23.46 MiB) |
| Headless UI | 不綁定樣式的 React 互動元件，可採用自訂黑白灰、液態玻璃與大圓角；近期推送較少，仍未封存。 | [tailwindlabs/headlessui](https://github.com/tailwindlabs/headlessui) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`； 官方授權來源：[LICENSE/授權](https://raw.githubusercontent.com/tailwindlabs/headlessui/main/LICENSE) | 未封存；最近推送 `2026-04-13` | `44_tailwindlabs__headlessui.zip` · 823,932 B (0.79 MiB) |
| Mantine | 完整 React 元件庫與主題 token，支援自訂顏色、radius 及 CSS，適合作為客製化元件基礎。 | [mantinedev/mantine](https://github.com/mantinedev/mantine) | `master` | GitHub SPDX `MIT`；授權辨識 `MIT License`； 官方授權來源：[LICENSE/授權](https://raw.githubusercontent.com/mantinedev/mantine/master/LICENSE) | 未封存；最近推送 `2026-09-26` | `45_mantinedev__mantine.zip` · 12,812,032 B (12.22 MiB) |

## 去重後 repository ZIP 清單與官方核驗
授權欄採 GitHub 官方 repository metadata（SPDX/license path）並保留原參考清單中的特殊授權提示；GitHub 的 license detector 不是逐檔法律意見。混合授權、NOASSERTION、子目錄及依賴授權應以精確版本逐檔複核。

| ID | 官方 repository / URL | 預設分支 | 授權／授權說明 | 狀態與最後 push | ZIP 下載大小 | SHA-256 |
|---:|---|---|---|---|---:|---|
| 01 | [langchain-ai/langchain](https://github.com/langchain-ai/langchain) | `master` | GitHub SPDX `MIT`；授權辨識 `MIT License`；參考清單說明：MIT；查精確依賴授權。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/langchain-ai/langchain/blob/master/LICENSE) | 未封存；最近推送 `2026-10-03` | 21,927,485 B (20.91 MiB) | `afd6c4c65a8efb380ee7b57341d5e65536565180e514a4ef46936f40ee3898e9` |
| 02 | [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`；參考清單說明：MIT。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/langchain-ai/langgraph/blob/main/LICENSE) | 未封存；最近推送 `2026-10-04` | 4,605,772 B (4.39 MiB) | `68c5dba178391b6b1554cec183541a7c4b4895bd3584d537f0f4b87c62b888b4` |
| 03 | [crewAIInc/crewAI](https://github.com/crewAIInc/crewAI) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`；參考清單說明：MIT。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/crewAIInc/crewAI/blob/main/LICENSE) | 未封存；最近推送 `2026-10-03` | 207,314,833 B (197.71 MiB) | `77946f4c27a97299c94af90514198742f06030146eec425452052e03d4d3af8a` |
| 04 | [microsoft/agent-framework](https://github.com/microsoft/agent-framework) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`；參考清單說明：MIT。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/microsoft/agent-framework/blob/main/LICENSE) | 未封存；最近推送 `2026-10-03` | 19,261,054 B (18.37 MiB) | `4b0986619a2e52fe7ee2dd52c5341b2b8b1e29562da3839a5f72c4a7809af996` |
| 05 | [microsoft/semantic-kernel](https://github.com/microsoft/semantic-kernel) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`；參考清單說明：MIT。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/microsoft/semantic-kernel/blob/main/LICENSE) | 未封存；最近推送 `2026-10-01` | 24,721,466 B (23.58 MiB) | `ddf625fc89cc38389f34453be5f064d7dfc0ce485b74e5dd97d513409178db5d` |
| 06 | [microsoft/autogen](https://github.com/microsoft/autogen) | `main` | GitHub SPDX `CC-BY-4.0`；授權辨識 `Creative Commons Attribution 4.0 International`；參考清單說明：程式碼 MIT；文件 CC BY-4.0，勿混用授權；核對 CODE license 與文件授權。 官方授權來源：[LICENSE/授權](https://github.com/microsoft/autogen/blob/main/LICENSE-CODE), [LICENSE/授權](https://github.com/microsoft/autogen/blob/main/LICENSE) | 未封存；最近推送 `2026-04-15` | 24,014,480 B (22.90 MiB) | `116a964fa7691fc673724961ac3b5c2860a7cf311aeb770dbaa6b3ed9866980d` |
| 07 | [google/adk-python](https://github.com/google/adk-python) | `main` | GitHub SPDX `Apache-2.0`；授權辨識 `Apache License 2.0`；參考清單說明：Apache-2.0。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/google/adk-python/blob/main/LICENSE) | 未封存；最近推送 `2026-10-04` | 13,634,874 B (13.00 MiB) | `9dc6e355ba48fc771057b81574dbbbcbcf05f8f832d492479b21f447035619be` |
| 08 | [openai/openai-agents-python](https://github.com/openai/openai-agents-python) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`；參考清單說明：MIT。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/openai/openai-agents-python/blob/main/LICENSE) | 未封存；最近推送 `2026-10-02` | 8,193,502 B (7.81 MiB) | `c3af030cb932ee13d9baaf4d7eaecb61f81699332d4f90c90b06cb9c730d1d49` |
| 09 | [run-llama/llama_index](https://github.com/run-llama/llama_index) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`；參考清單說明：MIT。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/run-llama/llama_index/blob/main/LICENSE) | 未封存；最近推送 `2026-10-01` | 288,633,849 B (275.26 MiB) | `fdea7885e3835ade178e23a3e00851fb5b1cc1c08a3f489281d8a2837dd3a290` |
| 10 | [deepset-ai/haystack](https://github.com/deepset-ai/haystack) | `main` | GitHub SPDX `Apache-2.0`；授權辨識 `Apache License 2.0`；參考清單說明：Apache-2.0。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/deepset-ai/haystack/blob/main/LICENSE) | 未封存；最近推送 `2026-10-02` | 38,909,590 B (37.11 MiB) | `78a07f8cd8ae45d44f983f814acf25a785ac2526a25f2ad9166159477e9c7b3e` |
| 11 | [stanfordnlp/dspy](https://github.com/stanfordnlp/dspy) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`；參考清單說明：MIT。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/stanfordnlp/dspy/blob/main/LICENSE) | 未封存；最近推送 `2026-10-03` | 17,892,366 B (17.06 MiB) | `2f26a9d2ab218102ec07cd765c4dc8387f796c60625c4d9f31fef935d97372c2` |
| 12 | [pydantic/pydantic-ai](https://github.com/pydantic/pydantic-ai) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`；參考清單說明：MIT。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/pydantic/pydantic-ai/blob/main/LICENSE) | 未封存；最近推送 `2026-10-03` | 180,029,298 B (171.69 MiB) | `c6936c41589305bbe7b2029139639dde3167c690683f1b536b43938bb1d40e9e` |
| 13 | [huggingface/smolagents](https://github.com/huggingface/smolagents) | `main` | GitHub SPDX `Apache-2.0`；授權辨識 `Apache License 2.0`；參考清單說明：Apache-2.0。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/huggingface/smolagents/blob/main/LICENSE) | 未封存；最近推送 `2026-09-30` | 1,307,266 B (1.25 MiB) | `00cbfb3ccbb9a0cf3fce45dbc95e595bee2492cf5c14b05bcca0b17f0b0982b4` |
| 14 | [agno-agi/agno](https://github.com/agno-agi/agno) | `main` | GitHub SPDX `Apache-2.0`；授權辨識 `Apache License 2.0`；參考清單說明：Apache-2.0。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/agno-agi/agno/blob/main/LICENSE) | 未封存；最近推送 `2026-10-03` | 23,383,229 B (22.30 MiB) | `7f0044205c7d93e0dee924ed9eb6d5b02d2f852cf3aae22233f2ece393719ee2` |
| 15 | [mastra-ai/mastra](https://github.com/mastra-ai/mastra) | `main` | GitHub 未偵測到單一 SPDX；參考清單說明：倉庫 `ee/` 以外 Apache-2.0；`ee/` 為 source-available 授權，production/再散布需有效書面授權與 key；逐檔 review。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/mastra-ai/mastra/blob/main/LICENSE) | 未封存；最近推送 `2026-10-04` | 60,093,972 B (57.31 MiB) | `cdd763398edb159873f466c7416e970f37af1e146adb0892a668eb0f949d41bf` |
| 16 | [vercel/ai](https://github.com/vercel/ai) | `main` | GitHub 未偵測到單一 SPDX；參考清單說明：Apache-2.0。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/vercel/ai/blob/main/LICENSE) | 未封存；最近推送 `2026-10-03` | 43,283,404 B (41.28 MiB) | `dffab537b3fb9ac46ddb6e5bdcf254de1ed265e3174ee7cbce3005797d2e4a82` |
| 17 | [langgenius/dify](https://github.com/langgenius/dify) | `main` | GitHub 未偵測到單一 SPDX；參考清單說明：Modified Apache-2.0：多租戶服務等限制、前端品牌條款；必須逐條 review。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/langgenius/dify/blob/main/LICENSE) | 未封存；最近推送 `2026-10-03` | 37,865,539 B (36.11 MiB) | `7a7cb3788528c19cba637c9bd24ae7887c2a015fe1cc591d846746498a0e3ea4` |
| 18 | [FlowiseAI/Flowise](https://github.com/FlowiseAI/Flowise) | `main` | GitHub 未偵測到單一 SPDX；參考清單說明：Apache-2.0 適用開源部分；enterprise 目錄/指定檔案為 Commercial License，逐檔查。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/FlowiseAI/Flowise/blob/main/LICENSE) | 已封存；最近推送 `2026-08-13` | 25,212,609 B (24.04 MiB) | `23ccb687332cb69bb8b95bf7847f9f933101c82742aa2423e46fa62703062fff` |
| 19 | [letta-ai/letta](https://github.com/letta-ai/letta) | `main` | GitHub SPDX `Apache-2.0`；授權辨識 `Apache License 2.0`；參考清單說明：Apache-2.0。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/letta-ai/letta/blob/main/LICENSE) | 未封存；最近推送 `2026-09-10` | 24,683 B (0.02 MiB) | `5d28f152aba633fcc26fe20125fad28f73c6773e6526fc65249656b2d0c61075` |
| 20 | [camel-ai/camel](https://github.com/camel-ai/camel) | `master` | GitHub SPDX `Apache-2.0`；授權辨識 `Apache License 2.0`；參考清單說明：Apache-2.0。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/camel-ai/camel/blob/master/LICENSE) | 未封存；最近推送 `2026-09-30` | 121,442,302 B (115.82 MiB) | `210a2c13ef006826e7e00427eb71269d79fc0b467e42627048d277e0cd2ce8cb` |
| 21 | [FoundationAgents/MetaGPT](https://github.com/FoundationAgents/MetaGPT) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`；參考清單說明：MIT。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/FoundationAgents/MetaGPT/blob/main/LICENSE) | 未封存；最近推送 `2026-01-21` | 20,107,289 B (19.18 MiB) | `b9137d7e0073fffa0d1acb1eb9dff1072b77eb715fa540f4529ce2be4c967dd9` |
| 22 | [OpenHands/OpenHands](https://github.com/OpenHands/OpenHands) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`；參考清單說明：主 repo MIT；採用子目錄/依賴前逐項檢查。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/OpenHands/OpenHands/blob/main/LICENSE) | 未封存；最近推送 `2026-10-03` | 7,799,643 B (7.44 MiB) | `c86c39a209d0f21c9b8c5317f1ee722132e5836b85ed5fd322400aec56a49e8a` |
| 23 | [langroid/langroid](https://github.com/langroid/langroid) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`；參考清單說明：MIT。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/langroid/langroid/blob/main/LICENSE) | 未封存；最近推送 `2026-10-03` | 59,737,359 B (56.97 MiB) | `6e7bce847f4af8179babf48f4395aead91a9c1c1e6f3fdfd25df2255727d435b` |
| 24 | [i-am-bee/beeai-framework](https://github.com/i-am-bee/beeai-framework) | `main` | GitHub SPDX `Apache-2.0`；授權辨識 `Apache License 2.0`；參考清單說明：Apache-2.0。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/i-am-bee/beeai-framework/blob/main/LICENSE) | 未封存；最近推送 `2026-09-28` | 2,309,475 B (2.20 MiB) | `ce77e9085fcf29e8a8ff5a0a5027c2ce8bbfc58accc7476b5b5072edd8cd2e54` |
| 25 | [agentscope-ai/agentscope](https://github.com/agentscope-ai/agentscope) | `main` | GitHub SPDX `Apache-2.0`；授權辨識 `Apache License 2.0`；參考清單說明：Apache-2.0；TeamPipeline experimental；依賴、MCP、Skills/服務另審。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/agentscope-ai/agentscope/blob/main/LICENSE) | 未封存；最近推送 `2026-09-30` | 8,785,200 B (8.38 MiB) | `894129a7dccebd8dee376fece36eba32c65007160380e4867e63cadb302ae002` |
| 26 | [ogx-ai/ogx](https://github.com/ogx-ai/ogx) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`；參考清單說明：MIT；repo API `NOASSERTION`/授權 owner 轉移須按 canonical LICENSE 與精確版本複核；模型權重授權分開。canonical LICENSE 官方授權來源：[LICENSE/授權](https://github.com/ogx-ai/ogx/blob/main/LICENSE) | 未封存；最近推送 `2026-10-02` | 26,247,112 B (25.03 MiB) | `88c5d94a49dc9ce83651aeed774aa6817228bd6ec585e372d12414ebb6d22a70` |
| 27 | [QwenLM/Qwen-Agent](https://github.com/QwenLM/Qwen-Agent) | `main` | GitHub SPDX `Apache-2.0`；授權辨識 `Apache License 2.0`；參考清單說明：Apache-2.0；依賴/模型與外部服務另審。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/QwenLM/Qwen-Agent/blob/main/LICENSE) | 未封存；最近推送 `2026-03-04` | 17,126,044 B (16.33 MiB) | `e76ba97dc299825b76b2a9712f8311238d758aab59c14bb701778c399c41fb2e` |
| 28 | [MervinPraison/PraisonAI](https://github.com/MervinPraison/PraisonAI) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`；參考清單說明：MIT；逐項審 extras、MCP servers、依賴。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/MervinPraison/PraisonAI/blob/main/LICENSE) | 未封存；最近推送 `2026-10-03` | 38,698,417 B (36.91 MiB) | `479498f818092bf3a0b08cf6fc5dd006ad1f24d334cd48224f57785a8b92e052` |
| 29 | [Significant-Gravitas/AutoGPT](https://github.com/Significant-Gravitas/AutoGPT) | `master` | GitHub 未偵測到單一 SPDX；參考清單說明：**混合授權**：`autogpt_platform/` Polyform Shield 1.0.0；目錄外 MIT。Shield 有競爭產品限制；法務 review 必須。LICENSE · Shield 官方授權來源：[LICENSE/授權](https://github.com/Significant-Gravitas/AutoGPT/blob/master/LICENSE), [LICENSE/授權](https://polyformproject.org/licenses/shield/1.0.0) | 未封存；最近推送 `2026-10-04` | 192,516,179 B (183.60 MiB) | `a694c6999e95ca7e5eecf207b63cb353164e00fb23f773aac0e9589db0e18ee2` |
| 30 | [microsoft/TaskWeaver](https://github.com/microsoft/TaskWeaver) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`；參考清單說明：MIT；依賴及容器映像需另審。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/microsoft/TaskWeaver/blob/main/LICENSE) | 已封存；最近推送 `2026-03-23` | 5,144,238 B (4.91 MiB) | `e722b6b60f215bb692118c54534bdc21eeffbe944ef00d752169fa9c1ed4620f` |
| 31 | [modelcontextprotocol/python-sdk](https://github.com/modelcontextprotocol/python-sdk) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`；參考清單說明：MIT；依賴與外部 server 另審。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/modelcontextprotocol/python-sdk/blob/main/LICENSE) | 未封存；最近推送 `2026-10-02` | 5,453,930 B (5.20 MiB) | `6cec48f5f45310702173d0506d484d62d032f3d25f36c96a22390d011f0ff9b6` |
| 32 | [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk) | `main` | GitHub 未偵測到單一 SPDX；參考清單說明：**混合授權**：新程式 Apache-2.0、部分既有貢獻 MIT、文件 CC-BY-4.0；API `NOASSERTION`，必須逐檔 license review。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/LICENSE) | 未封存；最近推送 `2026-10-02` | 2,928,972 B (2.79 MiB) | `f42ff96fabb598d4452d886737cc9215f883a3eb6f54b0c5fbd3b277183a5b3e` |
| 33 | [PrefectHQ/fastmcp](https://github.com/PrefectHQ/fastmcp) | `main` | GitHub SPDX `Apache-2.0`；授權辨識 `Apache License 2.0`；參考清單說明：Apache-2.0；傳遞依賴 docutils 授權需特別 review。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/PrefectHQ/fastmcp/blob/main/LICENSE) | 未封存；最近推送 `2026-10-04` | 43,640,177 B (41.62 MiB) | `c8be3251f0f4d80b527ac5ee6e0e698533b8b496ebe53f903b3da8251b2c56c3` |
| 34 | [lastmile-ai/mcp-agent](https://github.com/lastmile-ai/mcp-agent) | `main` | GitHub SPDX `Apache-2.0`；授權辨識 `Apache License 2.0`；參考清單說明：Apache-2.0。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/lastmile-ai/mcp-agent/blob/main/LICENSE) | 未封存；最近推送 `2026-01-25` | 21,002,246 B (20.03 MiB) | `8045f32b0ebf8320d69641d7bfe15a16bb259f3161e86b6e05a6859b66ae1765` |
| 35 | [mcp-use/mcp-use](https://github.com/mcp-use/mcp-use) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`；參考清單說明：MIT。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/mcp-use/mcp-use/blob/main/LICENSE) | 未封存；最近推送 `2026-10-02` | 113,232,392 B (107.99 MiB) | `68ba38e1f99037b6b0d562f04d7d193459a9678aa8cc22911bfc7478d94d5d98` |
| 36 | [ComposioHQ/composio](https://github.com/ComposioHQ/composio) | `next` | GitHub SPDX `MIT`；授權辨識 `MIT License`；參考清單說明：repo MIT；hosted platform ToS、每個第三方 app 條款另審。LICENSE · ToS 官方授權來源：[LICENSE/授權](https://github.com/ComposioHQ/composio/blob/next/LICENSE), [LICENSE/授權](https://composio.dev/terms) | 未封存；最近推送 `2026-10-04` | 86,546,109 B (82.54 MiB) | `28a87619d41293520c42a173e4f7259fae8427233cb7425dc06ee616b72888d6` |
| 37 | [browser-use/browser-use](https://github.com/browser-use/browser-use) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`；參考清單說明：MIT；依賴和託管服務條款另審。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/browser-use/browser-use/blob/main/LICENSE) | 未封存；最近推送 `2026-10-03` | 5,387,198 B (5.14 MiB) | `85ca7adb24bde3e192d122c8fbba77498789c552cbda4e4b2cef2059cc63c3a8` |
| 38 | [browserbase/stagehand](https://github.com/browserbase/stagehand) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`；參考清單說明：MIT；Browserbase/provider 與依賴條款另審。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/browserbase/stagehand/blob/main/LICENSE) | 未封存；最近推送 `2026-10-02` | 45,065,628 B (42.98 MiB) | `9d2b00c2a4a8f77e4c7078000ccdb4911584121d6befee953671c4fb943a8f96` |
| 39 | [openinterpreter/openinterpreter](https://github.com/openinterpreter/openinterpreter) | `main` | GitHub SPDX `Apache-2.0`；授權辨識 `Apache License 2.0`；參考清單說明：Apache-2.0；依賴/二進位另審。LICENSE 官方授權來源：[LICENSE/授權](https://github.com/openinterpreter/openinterpreter/blob/main/LICENSE) | 未封存；最近推送 `2026-10-02` | 23,243,037 B (22.17 MiB) | `7c25623ea6fbf574f623ca33bf0d9a90aff7fe71d249a671c509c95a7383e7a6` |
| 40 | [e2b-dev/E2B](https://github.com/e2b-dev/E2B) | `main` | GitHub SPDX `Apache-2.0`；授權辨識 `Apache License 2.0`；參考清單說明：**分層授權**：舊 repo 根 Apache-2.0；現行 Python/JS SDK package 各 MIT，須按所用 package 檢查。Python LICENSE · JS LICENSE 官方授權來源：[LICENSE/授權](https://github.com/e2b-dev/E2B/blob/main/packages/code-interpreter-python/LICENSE), [LICENSE/授權](https://github.com/e2b-dev/E2B/blob/main/packages/code-interpreter-js/LICENSE) | 未封存；最近推送 `2026-10-02` | 2,984,401 B (2.85 MiB) | `a946197628c615cf2a6b18989935658595724e6cf41b7fef8f4d856132a0329a` |
| 41 · UI | [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`； 官方授權來源：[LICENSE/授權](https://raw.githubusercontent.com/tailwindlabs/tailwindcss/main/LICENSE) | 未封存；最近推送 `2026-09-25` | 1,261,270 B (1.20 MiB) | `9eb5036011ac54329564b601fff34743f14692f6728e4420517e2d9c016ab4a6` |
| 42 · UI | [radix-ui/primitives](https://github.com/radix-ui/primitives) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`； 官方授權來源：[LICENSE/授權](https://github.com/radix-ui/primitives/blob/main/LICENSE) | 未封存；最近推送 `2026-08-08` | 1,454,319 B (1.39 MiB) | `7bba75d7dfb5f87900cff12c4ccebeef64e05b33febecdf419401054c7b164cd` |
| 43 · UI | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`； 官方授權來源：[LICENSE/授權](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md) | 未封存；最近推送 `2026-10-02` | 24,598,622 B (23.46 MiB) | `c5a9ed3625b53d560829c4339acd325dcd11923759fb40c36da534a2b042be04` |
| 44 · UI | [tailwindlabs/headlessui](https://github.com/tailwindlabs/headlessui) | `main` | GitHub SPDX `MIT`；授權辨識 `MIT License`； 官方授權來源：[LICENSE/授權](https://raw.githubusercontent.com/tailwindlabs/headlessui/main/LICENSE) | 未封存；最近推送 `2026-04-13` | 823,932 B (0.79 MiB) | `92b34d9e0ef5f6e30d295bc8363ff2beaa08ce6d2d72129cd8ab64989396aea4` |
| 45 · UI | [mantinedev/mantine](https://github.com/mantinedev/mantine) | `master` | GitHub SPDX `MIT`；授權辨識 `MIT License`； 官方授權來源：[LICENSE/授權](https://raw.githubusercontent.com/mantinedev/mantine/master/LICENSE) | 未封存；最近推送 `2026-09-26` | 12,812,032 B (12.22 MiB) | `69f1cf6b9871c7d123889437770573381f2633071ddbbd43ca919308dc864de7` |

## 來源解析、重疊與檔案保護
- canonicalization：清單中的舊 `meta-llama/llama-stack` 對應到 `ogx-ai/ogx`；FastMCP 以 `PrefectHQ/fastmcp` 為 canonical；E2B 舊 `code-interpreter` SDK repo 對應現行 `e2b-dev/E2B` monorepo。若 GitHub API 回傳 redirect，以上表格以最終 official `full_name`/`html_url` 為準。
- 重疊映射：B 類 5 項都是 A 類 repo 的子代理分派用法；C 類前 5 項（LangChain、Semantic Kernel、PydanticAI、smolagents、OpenAI Agents SDK）與 A 重疊；C 其餘項目保留各自 repo。每列仍在上表列出。
- 封存狀態及 `pushed_at` 是官方 GitHub metadata 的維護訊號快照，不等於安全審核或維護承諾。已封存 repo 仍按使用者清單保留其原始 source archive ZIP。
- 無障礙元件僅提供行為／語意基礎，不保證套用液態玻璃和主題後仍符合 WCAG；須另驗證鍵盤操作、焦點、對比及 reduced-motion。
- 封裝流程只讀取官方 repo metadata、下載官方 codeload ZIP、建立 7z 容器；沒有 clone、package install、解壓 repository 到工作目錄、啟動、測試或執行下載程式碼。
- 各 source archive URL 使用官方 repo 的 default branch；分支後續變動不會改變此包內的 snapshot。SHA-256 可用 `SHA256SUMS.txt` 驗證。
- PNG 來源及用途請見隨包原始 `reference/asset_manifest.md`。本包含有原目錄 12 張 PNG。
