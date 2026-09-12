#!/usr/bin/env bash
# growth/characters/file-frame.sh <slug> <NN-name>
#
# Files the newest Higgsfield download (~/Desktop/hf_*.png) as one identity-sheet frame:
# the PNG original goes to growth/characters/_originals/<slug>/<NN-name>.png (gitignored)
# and a q92 JPEG to growth/characters/<slug>/sheet/<NN-name>.jpg (the committed record).
set -euo pipefail
slug="${1:?slug}"; name="${2:?NN-name}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
src="$(ls -t "$HOME"/Desktop/hf_*.png 2>/dev/null | head -1 || true)"
[[ -n "$src" ]] || { echo "no hf_*.png on the Desktop"; exit 1; }
mkdir -p "$root/_originals/$slug" "$root/$slug/sheet"
mv "$src" "$root/_originals/$slug/$name.png"
sips -s format jpeg -s formatOptions 92 "$root/_originals/$slug/$name.png" --out "$root/$slug/sheet/$name.jpg" >/dev/null
echo "filed $slug/$name  ($(du -h "$root/$slug/sheet/$name.jpg" | cut -f1) jpeg)"
