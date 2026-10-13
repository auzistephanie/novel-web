# 顧事 — novel-web

本 repo 喺 `~/dev/novel-web`，有兩部分：

1. **網站「顧事」**（repo 根，`src/`）— 登入、睇中文網絡小說、㩒鍾意；連載可以親手揀專屬結局
2. **Python pipeline**（`pipeline/`）— 短劇同免費短片。舊 Telegram bot 已於 2026-07-11 移除，程式唔再喺樹入面（歷史用 `git log` 翻）

## 網站

- **Next.js 16**（App Router + TypeScript + Tailwind v4）
- **Supabase**：Auth（email/password）+ Postgres（`novel_stories` / `novel_likes` / `novel_endings`）
- **Vercel Cron**：每日 HKT 12:30 生成 1 篇連載 + 1 篇短篇（`GET /api/cron/generate-stories`）
- **DeepSeek**：讀者為連載揀分支，即時生成專屬結局。短篇已經有完結，唔再生成結局

| 路徑 | 說明 |
|---|---|
| `/login` | 登入／註冊 |
| `/` | 首頁：短篇故事＋每日連載 |
| `/story/[id]` | 全文；連載可以揀結局 |
| `/my-endings` | 登入後先見，自己嘅結局 |
| `/admin` | 故事列表＋刪除（限管理員） |

### 本機開發

```bash
npm install
npm run dev
```

`.env.local` 唔 commit，見 `.env.example`：

```
NEXT_PUBLIC_SUPABASE_URL=https://cmtubaxlniglklmdwlzs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase anon/publishable key>
DEEPSEEK_API_KEY=<DeepSeek key>
```

部署：https://novel-web-sepia.vercel.app （Vercel project `novel-web`，`main` 有網站檔改動會自動部署）。

只改 `pipeline/` 或 `CHANGELOG.md` 時跳過 Vercel build。喺 [Git settings](https://vercel.com/auzistephanies-projects/novel-web/settings/git) 設 Ignored Build Step：

```bash
git diff HEAD^ HEAD --quiet -- . ':!pipeline' ':!CHANGELOG.md'
```

命令成功（exit 0）＝今次 commit 冇網站檔改動＝跳過 build。

## Python pipeline

```
pipeline/
├── shortdrama/     # fal.ai 圖生片（收費）。見 pipeline/shortdrama/CLAUDE.md
├── videoclip/      # 免費短片：AI 圖 + Ken Burns + EdgeTTS。見 pipeline/videoclip/CLAUDE.md
├── docs/SYSTEMS.md # 舊 bot 年代嘅類別／連載／留存筆記
└── requirements.txt
```

```bash
pip install -r pipeline/requirements.txt
pip install -r pipeline/shortdrama/requirements.txt
pip install -r pipeline/videoclip/requirements.txt
```

`shortdrama/`、`videoclip/` 各自有 `.env.example`。片同 output 唔入 git。

## 推送

由 repo 根跑，一次一個 commit：

```bash
python3 scripts/github_push.py --check
python3 scripts/github_push.py "commit message"
```

改版記錄寫喺根目錄 `CHANGELOG.md` 頂部。
