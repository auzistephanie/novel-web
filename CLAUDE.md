# CLAUDE.md — 顧事 novel-web

由 `daily-novel`（Telegram bot 版）獨立分拆出嚟嘅網站產品。唔再推 Telegram，改做正式登入網站：故事牆、㩒鍾意、AI 定時生成個人化結局。

## 架構

- Next.js 16（App Router + TypeScript + Tailwind v4），scaffold 喺 `src/`
- Supabase（project `cmtubaxlniglklmdwlzs`，同 trips app 共用，table 用 `novel_` 前綴分隔）：
  - `novel_stories` — 故事本體，公開讀
  - `novel_likes` — user 鍾意記錄，RLS 淨本人
  - `novel_endings` — AI 生成嘅個人化結局，RLS 淨本人（寫入由 scheduled task 直接用 Supabase MCP 執行，繞過 RLS）
- 冇自建 API/service key——所有生成／寫入都由 Cowork scheduled task 入面嘅 Claude 直接用 Supabase MCP 執行 SQL

## 頁面

`/login`（Supabase Auth）· `/`（首頁，拆「短篇故事」＋「每日連載」兩個 section，各自獨立 genre 篩選）· `/story/[id]`（全文＋結局）· `/my-endings`（我的結局本，登入後先見，每個結局卡內建「展開故事全文」）

Side menu：桌面版左側直向（logo＋短篇故事／每日連載／我的結局本／登出），手機版收做頂部橫向 bar。組件係 `src/components/NavBar.tsx`（檔名未改但內容已經係 sidebar+mobile bar）。

## 內容型態（story_type，2026-07-05 加）

`novel_stories` 加咗 `story_type` 欄位：`'serial'`（連載爽文，1200-1800字，cliffhanger 收尾唔完整）／`'short'`（完整短篇，1000-1500字，有頭有尾）。首頁按呢個欄位分兩個 section 顯示。

⚠️ `short` 故事本身已經有齊結局，**唔應該**再生成「專屬結局」——`novel-ending-generator` 已加 `story_type = 'serial'` 篩選，story 詳情頁對 `short` 故事顯示唔同文案（唔會有喜歡→生成結局嘅 flow）。

## Scheduled tasks（喺 Cowork 度管理，唔喺呢個 repo）

- `novel-story-generator` — 每日 12:30 同 17:30 各跑一次，每次都生成新一批 3 篇（唔 check 今日出過幾多，逐次疊加），固定比例 2 連載＋1 短篇，25 類別加權池（男頻 weight 1 / 女頻 weight 2，同 daily-novel 個 pool 一致）
- `novel-ending-generator` — 每日 17:30，掃 `novel_likes` 中未有對應 `novel_endings` 嘅組合，逐個生成專屬結局

兩個 task 嘅完整 prompt 存喺 `~/Documents/Claude/Scheduled/<taskId>/SKILL.md`，修改用 `update_scheduled_task`，唔好淨係改呢份 repo 嘅文件以為會生效。

## 部署狀態

已上線：**https://novel-web-sepia.vercel.app**（Vercel project `novel-web`，接返 GitHub main branch，push 會自動 redeploy）。

⚠️ 之前部署曾撞 `EBADPLATFORM`：`package.json` 嘅 `dependencies` 唔可以出現任何 `@next/swc-linux-*-gnu` / `lightningcss-*` 呢類平台專用 optional binary package（呢啲應該由 npm 喺 build 機自動根據平台揀，唔應該手動 `npm install <pkg> --force` 加落 dependencies，否則會變成強制要求，喺唔同 CPU 架構嘅 build 機度必撞版）。

## 品牌名（2026-07-05 改名）

App 名由「爽文快遞」改做「**顧事**」——同「故事」喺國語＋粵語都完全同音，雙關「照顧/講究事情」，2 字精煉。全站（metadata、NavBar、Footer、Hero SVG 插畫、login page）已同步改名。

✅ 短篇/連載分流已落實（2026-07-05）：見上面「內容型態」一節。

## 開發須知

- `npm install` 要喺你自己電腦本機跑（唔好喺 Cowork sandbox 嘅 mounted folder 度跑 —— host↔sandbox 嘅 FUSE bridge 對大量細檔嘅 node_modules 唔穩定，會有 EPERM/Bus error）
- `.env.local` 已經有真實 Supabase URL/anon key（gitignored，唔喺 repo 度）
- 部署去 Vercel 要手動 connect 呢個 GitHub repo 一次（`vercel.com/new`），詳見 README「部署」一節
- 完成任何功能改動，記得 `git add -A && git commit && git push`（普通 git CLI 喺呢個 project 冇問題，因為冇用 daily-novel 嗰套 `github_push.py` workaround）
