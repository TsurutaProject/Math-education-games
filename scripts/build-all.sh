#!/usr/bin/env bash
# プラットフォーム（apps/platform/）と各ゲームをビルドして、公開と同じ形に dist/ へまとめる。
#
#   dist/            ← プラットフォームのホーム画面
#   dist/cake/       ← 分ケーキ
#   dist/shateki/    ← さんすう射的
#
# 同じ場所（同じ URL の配下）に置くので、localStorage のログを共有できる。
# 使い方:  scripts/build-all.sh
#   できあがった dist/ は、どの静的ホスティングにそのまま置いてもよい（相対パスで動く）。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/dist"

# ゲームの一覧: "公開するフォルダ名:ソースのフォルダ"
# 射的は本番版（games/shateki）ができたら、右側をそちらに変える。
GAMES=(
  "cake:games/cake"
  "shateki:prototypes/shateki-compare"
)

rm -rf "$OUT"
mkdir -p "$OUT"

echo "== platform (apps/platform) =="
(cd "$ROOT/apps/platform" && npm ci && npm run build)
cp -R "$ROOT/apps/platform/dist/." "$OUT/"

for entry in "${GAMES[@]}"; do
  name="${entry%%:*}"
  dir="${entry#*:}"
  echo "== $name ($dir) =="
  # --base=./ で、/cake/ のような深い場所に置いても動くようにする
  (cd "$ROOT/$dir" && npm ci && npm run build -- --base=./)
  mkdir -p "$OUT/$name"
  cp -R "$ROOT/$dir/dist/." "$OUT/$name/"
done

echo "done: $OUT"
