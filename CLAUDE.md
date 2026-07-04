# CLAUDE.md — 爽文快遞 novel-web

由 `daily-novel`（Telegram bot 版）獨立分拆出嚟嘅網站產品。唔再推 Telegram，改做正式登入網站：故事牆、㩒鍾意、AI 定時生成個人化結局。

## 架構

- Next.js 16（App Router + TypeScript + Tailwind v4），scaffold 喺 `src/`
- Supabase（project `cmtubaxlniglklmdwlzs`，同 trips app 共用，table 用 `novel_` 前綴分隔）：
  - `novel_stories` — 故事本體，公開讀
  - `novel_likes` — user 鍾意記錄，RLS 淨本人
  - `novel_endings` — AI 生成嘅個人化結局，RLS 淨本人（寫入由 scheduled task 直接用 Supabase MCP 執行，繞過 RLS）
- 冇自建 API/service key——所有生成／寫入都由 Cowork scheduled task 入面嘅 Claude 直接用 Supabase MCP 執行 SQL

## 頁面

`/login`（Supabase Auth）· `/`（故事牆）· `/story/[id]`（全文＋結局）· `/my-endings`（登入後先見）

## Scheduled tasks（喺 Cowork 度管理，唔喺呢個 repo）

- `novel-story-generator` — 每日 08:10，唔夠 3 篇就補到 3 篇，25 類別加權池（男頻 weight 1 / 女頻 weight 2，同 daily-novel 個 pool 一致）
- `novel-ending-generator` — 每日 20:09，掃 `novel_likes` 中未有對應 `novel_endings` 嘅組合，逐個生成專屬結局

兩個 task 嘅完整 prompt 存喺 `~/Documents/Claude/Scheduled/<taskId>/SKILL.md`，修改用 `update_scheduled_task`，唔好淨係改呢份 repo 嘅文件以為會生效。

## 開發須知

- `npm install` 要喺你自己電腦本機跑（唔好喺 Cowork sandbox 嘅 mounted folder 度跑 —— host↔sandbox 嘅 FUSE bridge 對大量細檔嘅 node_modules 唔穩定，會有 EPERM/Bus error）
- `.env.local` 已經有真實 Supabase URL/anon key（gitignored，唔喺 repo 度）
- 部署去 Vercel 要手動 connect 呢個 GitHub repo 一次（`vercel.com/new`），詳見 README「部署」一節
- 完成任何功能改動，記得 `git add -A && git commit && git push`（普通 git CLI 喺呢個 project 冇問題，因為冇用 daily-novel 嗰套 `github_push.py` workaround）
