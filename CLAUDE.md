# CLAUDE.md — 顧事 novel-web

由 `daily-novel`（Telegram bot 版）獨立分拆出嚟嘅網站產品。唔再推 Telegram，改做正式登入網站：故事牆、㩒鍾意、AI 定時生成個人化結局。改名／視覺／內容分流嘅決策史 → daily-novel `CHANGELOG.md`（2026-07-05 起數條）。

## ⚙️ Standards（MANDATORY — 正本：`stephanie-personal/docs/ai-governance/06-STANDARDS.md`，改規則只改正本）

Push（`github_push.py`，永不 git CLI・HTTPS・一 run 一 commit・**開工前 `--check`**・**收工即推**・三道閘 刪檔／SHA／交叉 review，撞閘唔好即刻 `--force`）・寫入分流（改動記錄 → `CHANGELOG.md` **頂部**；本檔上限 100 行/6KB）・清理 mv `_to_delete/`・方向性決定先 preview（02 §R3）・改完以用家身份 run 一次先報完成・governance 00–06（派工 01 §1＋03 模板；完成前過 02 §R2；冇 mount stephanie-personal 就叫 Stephanie 連埋）。**Codex 讀同層 `AGENTS.md`**。詳文＋例外表 → 正本。

> 內容系統詳解拆咗落 `docs/SYSTEMS.md`，按需 read_file。

> ⚠️ 巢狀 repo：改動記錄寫 **parent** `daily-novel/CHANGELOG.md` 頂部，唔係本目錄。其餘分流跟上面 ⚙️ Standards。

## 架構

- Next.js 16（App Router + TypeScript + Tailwind v4），scaffold 喺 `src/`
- Supabase（project `cmtubaxlniglklmdwlzs`，同 trips app 共用，table 用 `novel_` 前綴分隔）：
  - `novel_stories` — 故事本體，公開讀；DELETE 淨限 admin email（見下面 `/admin`）
  - `novel_likes` — user 鍾意記錄，RLS 淨本人；FK `ON DELETE CASCADE` 跟 `novel_stories`
  - `novel_endings` — AI 生成嘅個人化結局，RLS 淨本人；FK `ON DELETE CASCADE` 跟 `novel_stories`
- 故事生成／寫入用 `SUPABASE_SERVICE_ROLE_KEY`（Vercel env，見下「Scheduled generation」）；結局用 app 自己嘅 DeepSeek key（見下）；刪除故事靠 RLS policy，唔使 service-role key

## 頁面

`/login`（Supabase Auth）· `/`（首頁，「短篇故事」＋「每日連載」兩個 section，各自獨立 genre 篩選）· `/story/[id]`（全文＋結局）· `/my-endings`（我的結局本，登入後先見，`EndingBookshelf.tsx` 書脊格仔版面，改呢個元件唔好喺 `page.tsx` 加返 inline timeline）· `/admin`（故事列表＋刪除，淨 `auzistephanie@gmail.com` login 見到，`src/lib/admin.ts` 白名單；DELETE RLS policy 淨限 admin email，`novel_likes`／`novel_endings` cascade 自動清）

Side menu：桌面版左側直向，手機版收做頂部橫向 bar。組件係 `src/components/NavBar.tsx`（檔名未改但內容已經係 sidebar+mobile bar）。

## 內容型態（story_type）

`novel_stories.story_type`：`serial`（連載，2200-8000字，停喺抉擇/未揭曉節點）／`short`（完整短篇，1500-3000字，有頭有尾）。首頁按呢個欄位分兩個 section。House Style／字數／收尾規定嘅詳細字眼見 `src/app/api/cron/generate-stories/route.ts` 嘅 `STYLE_2026`／`SERIAL_STRUCTURE`／`SHORT_STRUCTURE` 常數。

⚠️ `short` 故事已經有齊結局，**唔應該**再生成「專屬結局」——`story` 詳情頁對 `short` 故事顯示唔同文案（冇結局生成 flow）。

## 結局生成（DeepSeek，即時）

讀者揀完連載故事 → `EndingFlow.tsx` 叫 `src/app/actions/endings.ts::getChoices`（DeepSeek 即場生成 3 個劇情分支）→ 揀一個 → `generateEnding`（DeepSeek 生成 400–700 字專屬結局，insert 入 `novel_endings`）。全程用 `src/lib/deepseek.ts` 嘅 key，冇經 Cowork Supabase MCP 寫入。同一故事可以生成多個結局（唔同分支），insert 唔 upsert。

## Scheduled generation（Vercel Cron，2026-08-01 起唔再靠 Cowork scheduled task）

- `vercel.json` cron `"30 4 * * *"`（UTC = HKT 12:30）打 `GET /api/cron/generate-stories`，**每日一次，1 serial + 1 short**
- 邏輯全部喺 `route.ts`：揀「骨架」（identity_reveal/contract_marriage/power_clash，5:3:2 權重）→ 獨立 slot 池組情節 → `gen_meta` 記低落 DB 俾下次排除近期組合；DeepSeek 生成＋code validate＋self-check，唔合格 retry 3 次；heartbeat 喺 route 尾段 upsert。「共鳴/落淚」「揭露機制」兩條硬規同緣由 → daily-novel `CHANGELOG.md` 2026-08-13
- ⚠️ 舊 Cowork skill／scheduled task `novel-story-generator` 係死殘留，改嗰份文件唔會生效——要改呢個 route.ts

## 部署狀態

已上線：**https://novel-web-sepia.vercel.app**（Vercel project `novel-web`，接 GitHub main branch，push 自動 redeploy）。

⚠️ `package.json` 嘅 `dependencies` 唔可以出現 `@next/swc-linux-*-gnu` / `lightningcss-*` 呢類平台專用 optional binary package（唔同 CPU 架構 build 機必撞 `EBADPLATFORM`）。

## 品牌／視覺

App 名「顧事」；花磚（雙層菱格紋，靛藍＋酒紅 `#7a3b32`）／Hero 插畫 `public/hero-cat.png`（換圖前確認授權）／配色 `--background` 白、`--color-cream` `#f6efe0`。定案史 → daily-novel `CHANGELOG.md` 2026-07-05。設計原則：花磚圖案淨用喺大面積背景／分隔帶，nav／filter pills 呢類窄小 UI 一律用素色/細線裝飾。

## 開發須知

- `npm install` 要喺你自己電腦本機跑（唔好喺 Cowork sandbox 嘅 mounted folder 度跑 —— FUSE bridge 對大量細檔嘅 node_modules 唔穩定，會有 EPERM/Bus error）
- `.env.local` 已經有真實 Supabase URL/anon key／DeepSeek key（gitignored，唔喺 repo 度）；`.env` 有 `GITHUB_TOKEN`（同樣 gitignored）
- 部署去 Vercel 要手動 connect 呢個 GitHub repo 一次（`vercel.com/new`），詳見 README「部署」一節
- ⚠️ **本 repo 獨立推**（推 daily-novel 唔會連佢一齊）：Cowork **container** 跑會撞 `403 not enabled for this session`（sandbox 擋 api.github.com）→ 經 `desktop-commander` 喺真 Mac 跑就冇事（07-31 實測 `c319031`）。
- ⚠️ **Cowork sandbox 唔好直接喺 mounted folder 度 `git commit`/`git fetch`**：FUSE bridge 對 `.git` 內部寫入會報 `Operation not permitted`，令 `.git/index` 近乎空白。雲端要驗證改動時：喺 sandbox `/tmp` fresh clone → 複製改動檔案落去 → 喺嗰度跑 build 驗證，唔好郁 mounted folder 嘅 `.git`。

