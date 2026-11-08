#!/usr/bin/env bash
# Renders both framings to PNG frames, then writes the AVIF frames the landing page loads.
set -euo pipefail
cd "$(dirname "$0")/.."
out=../public/hero
rm -rf frames && mkdir -p frames
npx hyperframes render . --format png-sequence --fps 30 --quality delivery -o frames/wide
npx hyperframes render . -c tall.html --format png-sequence --fps 30 --quality delivery -o frames/tall
node scripts/encode.mjs frames/wide "$out/wide-hd" 3200
node scripts/encode.mjs frames/wide "$out/wide" 2560
node scripts/encode.mjs frames/tall "$out/tall" 1080
