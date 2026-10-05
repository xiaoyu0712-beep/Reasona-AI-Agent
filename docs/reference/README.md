# Reasona 參考附件

此資料夾保存使用者提供的 Reasona 模型選型、開源 Agent 技術、研究流程與候選框架文件。全部內容皆是**截至附件日期的研究參考**，不是已驗證市場事實、最終架構決策、套件安裝清單或授權法律意見。

- `opensource_landscape.md`：開源 Agent／推理元件概況。
- `reasona_model_selection_zh-TW.md`：模型選型比較；使用前仍須核對硬體、授權、成本與政策。
- `reasona_technical_comparison_zh-TW.md`：技術比較與整合驗收參考。
- `source_research_workflow.md`：來源研究流程、claim trace 與驗收條件。
- `frameworks_30_5_15.md`：新附件中的 30 個 Agent、5 個分派框架、15 個工具框架，以及官方來源和單一 runtime 建議。
- `source_bundle_readme.md`：新版 source bundle 的內容與 45 個 repository snapshot 清單說明。只對 ZIP 中有限 README／LICENSE／manifest 做靜態檢查；未抽取原始碼、執行或安裝。
- `source_bundle_integration.md`：檔案盤點、素材校驗、metadata-only 檢查及選擇性採用紀錄。
- `source_framework_audit_2026-10-05.md`：對附件 45 個上游 repository snapshot 的逐項技術、授權線索與 Reasona/GitHub Pages 相容性評估；不是法律意見、供應鏈認證或安裝授權。
- `SHA256SUMS.txt`：附件原始 manifest，含 45 ZIP 與 12 PNG 的 SHA-256 值；ZIP 本體未放進 repository。
- `asset_manifest.md`：新版封包 12 張黑白灰 PNG 的來源與用途。
- `reference_bundle_readme.md`：較早一份參考封包的 README。

## 實際預設安裝與安全界線

本專案的直接依賴見 root、web、server 的 `package.json` 和 `package-lock.json`。目前實際安裝了瀏覽器端 `@mlc-ai/web-llm`、React／Vite、Tailwind CSS、Radix AlertDialog、Lucide、測試工具，以及未連接呼叫流程的 server-side Vercel AI SDK、Express/SQLite/OIDC 基礎。精確版本和使用限制以 repository README 為準。

**不會**把候選清單中的 50 個項目全裝。LangGraph、CrewAI、PydanticAI、各 MCP SDK/servers、browser automation、shell/任意程式碼執行、E2B/cloud sandbox、其他 provider 和多套 UI component framework 都不是本專案預設可用功能。此靜態 UI 沒有連接後端 API、來源檢索或外部工具。未經使用者明確授權，不應啟用外部帳戶、網路工具或副作用操作。

附件文件中的版本、日期、授權與維護狀態，使用時需回到其官方連結重新核實；不表示有做市場驗證或模型品質評測。
