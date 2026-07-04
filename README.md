# 爽文快遞 — novel-web

每日一頁，爽到停唔到。AI 生成中文網絡爽文嘅網站版：登入、睇故事、㩒鍾意，AI 定時幫你生成個人化結局。

呢個 project 同 `daily-novel`（Telegram bot 版）獨立分開，唔再推 Telegram。

## 架構

- **Next.js 16**（App Router + TypeScript + Tailwind v4）
- **Supabase**：Auth（email/password）+ Postgres（`novel_stories` / `novel_likes` / `novel_endings`，`novel_` 前綴，同其他 project 共用一個 Supabase project）
- **Cowork scheduled tasks**：由 Claude 定時生成故事同個人化結局，直接寫入 Supabase（唔經任何自建 API/key）
- **Vercel**：部署（見下面「部署」一節）

## 頁面

| 路徑 | 說明 |
|---|---|
| `/login` | 登入／註冊（Supabase Auth） |
| `/` | 故事牆，可以㩒鍾意 |
| `/story/[id]` | 故事全文＋鍾意狀態＋專屬結局（如有） |
| `/my-endings` | 登入後先睇到，自己嘅個人化結局清單 |

## 本機開發

```bash
npm install
npm run dev
```

需要 `.env.local`（唔 commit，見 `.env.example`）：

```
NEXT_PUBLIC_SUPABASE_URL=https://cmtubaxlniglklmdwlzs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase 嘅 anon/publishable key>
```

## 資料庫（Supabase）

三張表已經喺 `auzistephanie's Project`（project ref `cmtubaxlniglklmdwlzs`）建好：

- `novel_stories` — 故事本體，公開讀（`select` 政策 `using (true)`）
- `novel_likes` — user 鍾意邊篇，RLS 淨係本人可見/可改
- `novel_endings` — AI 生成嘅個人化結局，RLS 淨係本人可見（寫入由 scheduled task 直接用 Supabase MCP 執行，唔經 RLS）

## Scheduled tasks

兩個排程任務用 Cowork 嘅 `mcp__scheduled-tasks` 建立，Prompt 入面直接指示 Claude 用 Supabase MCP 讀寫：

1. **novel-story-generator** — 定時生成新故事，insert 入 `novel_stories`
2. **novel-ending-generator** — 定時掃 `novel_likes` 邊啲仲未有對應 `novel_endings`，幫個別 user 生成專屬結局

## 部署（Vercel）

呢個 repo 冇連 Vercel API，需要手動一次性設定：

1. 上 [vercel.com/new](https://vercel.com/new)，揀返 `auzistephanie/novel-web` 呢個 GitHub repo
2. Environment Variables 加返 `.env.local` 嗰兩條（`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`）
3. Deploy —— 之後每次 `git push` main 都會自動重新部署
