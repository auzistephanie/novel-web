# pipeline/

Python 工具，同網站「顧事」同一個 repo（`~/dev/novel-web`）。用法同架構見 repo 根 [README.md](../README.md)。

- `shortdrama/` — fal.ai 圖生片。`python3 video_gen.py`、`python3 assemble.py`（要喺呢個目錄跑，或者傳入 storyboard 路徑）
- `videoclip/` — 免費短片。`image_gen.py`、`tts_gen.py`、`assemble.py` 都用 `Path(__file__)` 搵自己嘅 `.env` 同 `output/`
- `docs/SYSTEMS.md` — 舊 Telegram bot 嘅類別／連載筆記（bot 程式 2026-07-11 已刪）
- `requirements.txt` — 舊 bot 依賴（openai、requests、python-dotenv、flask、gunicorn）

推送用 repo 根 `python3 scripts/github_push.py`，呢度冇第二份 script。
