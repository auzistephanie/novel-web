#!/bin/bash
set -e

cd ~/daily-novel/novel-web

echo "== 清返 CLAUDE.md 個 stash 衝突 =="
git checkout HEAD -- CLAUDE.md
git add CLAUDE.md

echo "== Rebase 上 origin/main =="
git rebase origin/main

echo "== Push 去 GitHub =="
git push origin main

echo ""
echo "✅ 完成！題材大類固定色改動已經 push 咗去 main。"
echo "（頭先個 stash 仲喺度未攞返出嚟，唔急，想睇返可以跑 git stash list）"
