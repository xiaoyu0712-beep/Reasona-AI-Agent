# Reasona 參考附件

本資料夾保存使用者提供的 Reasona-Manus-Reference-Bundle（2026-10-04）研究文件與素材 manifest，作為設計／工程參考，**不是 Reasona 已驗證的市場事實、最終模型決策或已安裝能力清單**。

- `opensource_landscape.md`：開源 Agent 與推理組件概況。
- `reasona_model_selection_zh-TW.md`：模型選型研究；仍需硬體、預算、資料政策、權重／API 授權確認。
- `reasona_technical_comparison_zh-TW.md`：技術選型與整合驗收建議。
- `source_research_workflow.md`：來源密集研究流程與驗收條件。
- `frameworks_30_5_15.md`：30 個 Agent 框架、5 個子代理分派框架與 15 個工具整合框架的候選清單。
- `asset_manifest.md`：隨包 12 張黑白灰 PNG 的用途與來源聲明。
- `reference_bundle_readme.md`：原始封包 README。

## 安裝狀態與權限界線

候選清單不等於 dependency list。此 repository 僅採用附件對 TypeScript/Node 後端提出的**單一 Vercel AI SDK**建議；實際安裝及版本見根目錄 README/package-lock。該 SDK 尚未接上 provider、模型或 Agent runner，不會自行發出網路請求。MCP、瀏覽器、shell、任意程式碼執行、外部副作用工具、模型 provider SDK 與雲端 sandbox 均未預裝／未授權。

文件中的日期、官方來源連結、版本與授權描述保留原附件內容；使用前仍需回到文件所連結的官方來源重新核對。未做市場研究，也沒有以這些參考材料宣稱需求或模型品質已驗證。
