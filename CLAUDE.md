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

## Hero 插畫（2026-07-05 定案，最終改做真實圖片）

`src/components/Hero.tsx` 右側插畫試過幾個方向：書店招牌（太不相干）→ 花磚馬賽克摺書（太肉酸）→ 純花磚板＋印章 → 手畫 SVG 貓仔瞓書堆（Stephanie 反饋「太抽象」）。**最終定案：用 Stephanie 提供嘅 AI 生成貓仔瞓書堆貼紙圖**（`public/hero-cat.png`，透明背景，`next/image` 顯示），唔再用手畫 SVG primitive。

⚠️ 呢張圖嘅來源／授權由 Stephanie 確認（佢話係「AI 生成」），先當自己有權用。日後如果要換第二張圖，直接換 `public/hero-cat.png` 呢個檔案（記得先確認新圖版權／授權），Hero.tsx 嘅 `<Image>` 唔使改。

## 花磚圖案 + 配色（2026-07-05，B 方案定案）

根據 Hero 貓仔貼紙圖嘅書皮花紋，提議過 3 個全站視覺升級方向（A 典藏書卷最豐富／B 輕奢克制／C 復古藏書票），Stephanie 揀咗 **B（輕奢克制）**：唔大改版面結構，淨係將花磚圖案由單層菱格升級做**雙層菱格紋**（外層靛藍描邊＋內層新加嘅酒紅 `#7a3b32` 描邊＋磚紅中心點），套用晒 `TileDivider.tsx`、`globals.css` 嘅 `.tile-pattern-bg`／`.tile-pattern-vertical`（sidebar／footer／login／my-endings 全部連帶更新），加埋 `genreColor.ts` 第 5 隻色「酒紅」入類別調色盤。冇改 StoryCard 版面結構、冇加燙金角花（嗰啲係 A 方案先有，冇落實）。

### 底色轉白＋花磚透明度加高（2026-07-05 追加）

Stephanie 睇完 B 方案覺得花磚太隱（sidebar 淨 5% opacity 幾乎睇唔出），要求：1) 圖案透明度加高至睇得出；2) 全站底色由米黃 `#f6efe0` 轉做白色。落實做法：
- `globals.css` 嘅 `--background` 由 `#f6efe0` 改做 `#ffffff`（`--color-cream` 保留唔變，依然係 `#f6efe0`，改做「卡片強調色」用）
- 花磚圖案 opacity：sidebar `NavBar.tsx` 由 `.05`→`.16`，login page 由 `.08`→`.18`
- 原本 `bg-white/60` 嘅卡片（`StoryCard.tsx`、`my-endings` 結局卡、`story/[id]` 內文框、login 卡片）全部改做實色 `bg-cream`，喺白色頁面上做返卡片同背景嘅對比（以前係「米黃頁面＋白卡片」，而家反轉做「白頁面＋米黃卡片」）
- `TileDivider.tsx` 淺色版本嘅 rect 底色維持 `#f6efe0`（唔跟住轉白），刻意保留米黃做 divider 嘅強調條

## 開發須知

- `npm install` 要喺你自己電腦本機跑（唔好喺 Cowork sandbox 嘅 mounted folder 度跑 —— host↔sandbox 嘅 FUSE bridge 對大量細檔嘅 node_modules 唔穩定，會有 EPERM/Bus error）
- `.env.local` 已經有真實 Supabase URL/anon key（gitignored，唔喺 repo 度）
- 部署去 Vercel 要手動 connect 呢個 GitHub repo 一次（`vercel.com/new`），詳見 README「部署」一節
- 完成任何功能改動，記得 `git add -A && git commit && git push`（普通 git CLI 喺呢個 project 冇問題，因為冇用 daily-novel 嗰套 `github_push.py` workaround）
