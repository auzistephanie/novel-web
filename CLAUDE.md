# CLAUDE.md — 顧事 novel-web

本 repo 喺 `~/dev/novel-web`：網站「顧事」同 Python pipeline 同一個 git。舊 Telegram bot 已於 2026-07-11 刪走（翻查睇 git 歷史）。改版史 → 根目錄 `CHANGELOG.md`。

## ⚙️ Standards（MANDATORY — 正本：`stephanie-personal/docs/ai-governance/STANDARDS.md`，改規則只改正本）

Push（`python3 scripts/github_push.py`，由 repo 根跑；永不 git CLI・HTTPS・一 run 一 commit・**開工前 `--check`**・**收工即推**・閘 1 刪檔／閘 2 SHA，撞閘唔好即刻 `--force`）・寫入分流（改動記錄 → `CHANGELOG.md` **頂部**；本檔上限 100 行/6KB）・清理 mv `_to_delete/`・方向性決定先 preview（STANDARDS §S3）・改完以用家身份 run 一次先報完成・governance DIAGNOSIS+STANDARDS（完成前過 STANDARDS §S2；冇 mount stephanie-personal 就叫 Stephanie 連埋）。**Codex 讀同層 `AGENTS.md`**。詳文＋例外表 → 正本。

> 內容系統（bot 年代參考）→ `pipeline/docs/SYSTEMS.md`。

## 網站（Next.js，`src/`）

Next.js 16（App Router + TypeScript + Tailwind v4）。Supabase `cmtubaxlniglklmdwlzs`（同 trips 共用，`novel_` 前綴）：`novel_stories` 公開讀，DELETE 淨限 admin email；`novel_likes`／`novel_endings` RLS 淨本人，FK `ON DELETE CASCADE`。故事寫入用 `SUPABASE_SERVICE_ROLE_KEY`；結局用 `src/lib/deepseek.ts`。

頁面：`/login` · `/`（短篇＋連載，各自 genre 篩選）· `/story/[id]` · `/my-endings`（`EndingBookshelf.tsx`，唔好喺 `page.tsx` 加 inline timeline）· `/admin`（淨 `auzistephanie@gmail.com`，`src/lib/admin.ts`）。Nav：`src/components/NavBar.tsx`。

`story_type`：`serial`（3600–8000字，停喺抉擇）／`short`（2600–5000字，有頭有尾）。**short 唔生成專屬結局**。House Style 見 `src/app/api/cron/generate-stories/route.ts` 嘅 `STYLE_2026`／`SERIAL_STRUCTURE`／`SHORT_STRUCTURE`。

結局：`EndingFlow.tsx` → `getChoices` → `generateEnding`（400–700字，insert 唔 upsert）。

Cron：`vercel.json` `"30 4 * * *"`（HKT 12:30）每日 1 serial + 1 short。9 條 `LANES`（`kanbujian`「看不見的好」權重 2，入 short 日常輪換；`?lane=kanbujian` 仍可手動指定）。雙稿＋`readerJudge`；`＊＊＊` 分節。`gen_meta`＝`{lane,angle?,premise,form,judge,teaser,series?}`。`?dry=1&lane=` 唔寫 DB。舊 skill `novel-story-generator` 已死，改 `route.ts`。

上線：https://novel-web-sepia.vercel.app 。`dependencies` 唔可以有 `@next/swc-linux-*-gnu`／`lightningcss-*`。

品牌：花磚（靛藍＋酒紅 `#7a3b32`）／`public/hero-cat.png`（換圖前確認授權）／`--color-cream` `#f6efe0`。花磚淨用大面積；nav／pills 用素色。

## Python（`pipeline/`）

- `pipeline/shortdrama/` — fal.ai 圖生片。見 `pipeline/shortdrama/CLAUDE.md`
- `pipeline/videoclip/` — 免費短片（AI 圖＋Ken Burns＋EdgeTTS）。見 `pipeline/videoclip/CLAUDE.md`
- 依賴：`pipeline/requirements.txt`，以及上面兩個子目錄自己嘅 `requirements.txt`
- 只得一份 push script：根目錄 `scripts/github_push.py`（`REPO`＝本 repo 根）

## 完成前

1. 改網站 → `npm run build` 實際行一次
2. 改 `pipeline/` script → 實跑一次貼 output
3. Push：`python3 scripts/github_push.py "<msg>"` ＋核實 GitHub HEAD

## 開發須知

- `npm install` 喺本機跑（Cowork FUSE 對 `node_modules` 唔穩）
- `.env.local`：Supabase URL／anon／DeepSeek；`.env`：`GITHUB_TOKEN`（gitignored）
- Cowork sandbox 唔好喺 mounted folder `git commit`／`git fetch`
