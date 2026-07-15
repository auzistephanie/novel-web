# CLAUDE.md — 顧事 novel-web

由 `daily-novel`（Telegram bot 版）獨立分拆出嚟嘅網站產品。唔再推 Telegram，改做正式登入網站：故事牆、㩒鍾意、AI 定時生成個人化結局。改名／視覺／內容分流嘅決策史 → daily-novel `CHANGELOG.md`（2026-07-05 起數條）。

> 內容系統詳解拆咗落 `docs/SYSTEMS.md`，按需 read_file。

## ✍️ 寫入分流（MANDATORY — 想更新本檔前先讀）

- **改動記錄／開發史** → daily-novel root `CHANGELOG.md` **頂部**，唔准 append 落本檔；本檔硬上限 **100 行／6KB**
- 本檔只准改：路由行、現行規則本身變咗。完整分流表 → `stephanie-personal/docs/ai-governance/04-MAINTENANCE.md` §0

## 架構

- Next.js 16（App Router + TypeScript + Tailwind v4），scaffold 喺 `src/`
- Supabase（project `cmtubaxlniglklmdwlzs`，同 trips app 共用，table 用 `novel_` 前綴分隔）：
  - `novel_stories` — 故事本體，公開讀；DELETE 淨限 admin email（見下面 `/admin`）
  - `novel_likes` — user 鍾意記錄，RLS 淨本人；FK `ON DELETE CASCADE` 跟 `novel_stories`
  - `novel_endings` — AI 生成嘅個人化結局，RLS 淨本人；FK `ON DELETE CASCADE` 跟 `novel_stories`
- 冇自建 API/service key——生成／寫入用 Cowork scheduled task 嘅 Supabase MCP；結局用 app 自己嘅 DeepSeek key（見下）；刪除故事靠 RLS policy，唔使 service-role key

## 頁面

`/login`（Supabase Auth）· `/`（首頁，「短篇故事」＋「每日連載」兩個 section，各自獨立 genre 篩選）· `/story/[id]`（全文＋結局）· `/my-endings`（我的結局本，登入後先見，`EndingBookshelf.tsx` 書脊格仔版面，改呢個元件唔好喺 `page.tsx` 加返 inline timeline）· `/admin`（故事列表＋刪除，淨 `auzistephanie@gmail.com` login 見到，`src/lib/admin.ts` 白名單；DELETE RLS policy 淨限 admin email，`novel_likes`／`novel_endings` cascade 自動清）

Side menu：桌面版左側直向，手機版收做頂部橫向 bar。組件係 `src/components/NavBar.tsx`（檔名未改但內容已經係 sidebar+mobile bar）。

## 內容型態（story_type）

`novel_stories.story_type`：`'serial'`（連載爽文，1200-1800字，cliffhanger 收尾）／`'short'`（完整短篇，1500-2200字，有頭有尾）。首頁按呢個欄位分兩個 section。短篇情感深度四項硬性要求詳細字眼見 `novel-story-generator` scheduled task 嘅 SKILL.md。

⚠️ `short` 故事已經有齊結局，**唔應該**再生成「專屬結局」——`story` 詳情頁對 `short` 故事顯示唔同文案（冇結局生成 flow）。

## 結局生成（DeepSeek，即時）

讀者揀完連載故事 → `EndingFlow.tsx` 叫 `src/app/actions/endings.ts::getChoices`（DeepSeek 即場生成 3 個劇情分支）→ 揀一個 → `generateEnding`（DeepSeek 生成 400–700 字專屬結局，insert 入 `novel_endings`）。全程用 `src/lib/deepseek.ts` 嘅 key，冇經 Cowork Supabase MCP 寫入。同一故事可以生成多個結局（唔同分支），insert 唔 upsert。

## Scheduled tasks（喺 Cowork 度管理，唔喺呢個 repo）

- `novel-story-generator` — 每日 12:30 同 17:30 各跑一次，每次生成新一批 3 篇，固定比例 2 連載＋1 短篇，30 類別加權池（男頻 weight 1 / 女頻 weight 2，同 `daily-novel/docs/SYSTEMS.md` Phase 2 類別同步）

完整 prompt 存喺 scheduled task 真身（`stephanie-personal/scheduled-tasks/novel-story-generator/SKILL.md`），修改用 `update_scheduled_task`，唔好淨係改呢份 repo 嘅文件以為會生效。

## 部署狀態

已上線：**https://novel-web-sepia.vercel.app**（Vercel project `novel-web`，接 GitHub main branch，push 自動 redeploy）。

⚠️ `package.json` 嘅 `dependencies` 唔可以出現 `@next/swc-linux-*-gnu` / `lightningcss-*` 呢類平台專用 optional binary package（唔同 CPU 架構 build 機必撞 `EBADPLATFORM`）。

## 品牌／視覺

App 名「顧事」；花磚圖案（雙層菱格紋，靛藍＋酒紅 `#7a3b32`）／Hero 插畫（`public/hero-cat.png`，換圖前確認授權）／配色（`--background` 白色、`--color-cream` `#f6efe0` 做卡片強調色）定案史 → daily-novel `CHANGELOG.md` 2026-07-05 條目。設計原則：花磚圖案淨用喺大面積背景／分隔帶，nav／filter pills 呢類窄小 UI 一律用素色/細線裝飾。

## 開發須知

- `npm install` 要喺你自己電腦本機跑（唔好喺 Cowork sandbox 嘅 mounted folder 度跑 —— FUSE bridge 對大量細檔嘅 node_modules 唔穩定，會有 EPERM/Bus error）
- `.env.local` 已經有真實 Supabase URL/anon key／DeepSeek key（gitignored，唔喺 repo 度）；`.env` 有 `GITHUB_TOKEN`（同樣 gitignored）
- 部署去 Vercel 要手動 connect 呢個 GitHub repo 一次（`vercel.com/new`），詳見 README「部署」一節
- ⚠️ **推送本 repo**：`python3 github_push.py "<commit message>"`（GitHub API，PAT in `.env`，跟返全 repo 鐵律「永不用 git CLI」）。⚠️ Cowork **雲端** sandbox 跑呢個 script 會撞 `403 GitHub access to this repository is not enabled for this session`（api.github.com 畀 sandbox 網絡政策擋咗，但 `git clone`/`git push` 走 github.com git protocol 唔受影響）——雲端遇到 403，用 `device_commit_files` 寫返 Mac，本機跑 `github_push.py`，唔好改用 plain git CLI push 頂替。
- ⚠️ **Cowork sandbox 唔好直接喺 mounted folder 度 `git commit`/`git fetch`**：FUSE bridge 對 `.git` 內部寫入會報 `Operation not permitted`，令 `.git/index` 近乎空白。雲端要驗證改動時：喺 sandbox `/tmp` fresh clone → 複製改動檔案落去 → 喺嗰度跑 build 驗證，唔好郁 mounted folder 嘅 `.git`。
