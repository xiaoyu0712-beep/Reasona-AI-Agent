# Source bundle integration note

## 輸入與處理範圍

- 使用者提供的 `Reasona-Frameworks-UI-Tools-Source-Bundle.7z`：約 1.96 GB，列有 45 個 GitHub source archive ZIP、12 張 PNG、bundle README、checksums 和兩份 reference 文件。
- 在 `/tmp` 隔離區抽取 45 個 ZIP 容器供唯讀檢查；使用 Python 標準庫掃描 ZIP central directory，並只讀每個專案最多 12 個有限大小的 README／LICENSE／package manifest 檔案。總計列出 234,867 個內部檔案項目、約 3.72 GiB 宣告未壓縮大小；未發現絕對路徑或 `..` path entry。上游專案原始碼未解壓、執行、安裝或 build，ZIP scripts 亦未執行。
- bundle README、checksums、reference markdown 與 12 PNG 抽取到隔離 staging；ZIP metadata 只作不可信資料。45 個上游 snapshot 的逐項框架／授權線索／runtime／Pages 相容性摘要已整理於 `source_framework_audit_2026-10-05.md`；報告不是法律、供應鏈或安全認證，也不授權安裝或啟用候選項目。
- 解壓所得 12 張 PNG 的 SHA-256 已核對；它們已納入 `apps/web/public/assets/reasona/`，並實際顯示在工作台角色、空狀態及素材檢視區。
- `frameworks_30_5_15.md` 納入本資料夾作候選索引。它包含 50 個分類項目（30 Agent + 5 dispatcher + 15 tools），部分為跨類重複；不可將這些名稱誤當成已整合功能。

## 選擇性採用與未採用

目前保留少量既有元件：TypeScript/Node 程式碼預裝 Vercel AI SDK（尚未接入後端 provider 流程）；瀏覽器端為明確點選後載入的 WebLLM 本機推理；React UI 使用 Tailwind CSS 與 Radix AlertDialog。沒有把不同語言、不同運行模型、各自要求外部服務／資料庫／容器的所有 Agent framework 和 plugin 合併安裝。實際預裝清單與未接通項目以逐項評估報告及 README 為準。

MCP、Browser、shell、任意程式碼執行、雲端 sandbox 與外部副作用插件未預設開放。未來接入前必須逐項審核授權、資料流、權限、網路出口與隔離方式，並提供最小權限和人為核准。

這是範圍管理和供應鏈風險控制，不是對其他候選專案的品質或市場結論。候選清單中的官方來源與授權資料在正式使用前仍應重新核對。
