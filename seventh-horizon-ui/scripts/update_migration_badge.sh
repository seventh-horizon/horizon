#!/usr/bin/env bash
set -euo pipefail

ROOT="seventh-horizon-ui"
CHECKLIST="$ROOT/MIGRATION_CHECKLIST.md"
BADGE_DIR="$ROOT/badges"
BADGE_FILE="$BADGE_DIR/migration-progress.svg"

mkdir -p "$BADGE_DIR"

if [[ ! -f "$CHECKLIST" ]]; then
  echo "Checklist not found at $CHECKLIST" >&2
  exit 1
fi

# Count checked and total tasks, tolerating 0 matches (grep returns 1 on no matches).
# Support both '-' and '*' bullets; case-insensitive on 'x'.
checked=$({ grep -oiE -- '^[[:space:]]*[-*][[:space:]]\[[x]\]' "$CHECKLIST" || true; } | wc -l | tr -d ' ')
all=$({ grep -oiE -- '^[[:space:]]*[-*][[:space:]]\[( |x)\]' "$CHECKLIST" || true; } | wc -l | tr -d ' ')

if [[ "${all:-0}" -eq 0 ]]; then
  percent=0
else
  percent=$(( 100 * checked / all ))
fi

label="migration"
message="${percent}%"

# Choose a color name based on percent
color="blue"
if (( percent >= 90 )); then
  color="brightgreen"
elif (( percent >= 70 )); then
  color="green"
elif (( percent >= 50 )); then
  color="yellow"
elif (( percent >= 30 )); then
  color="orange"
else
  color="red"
fi

# Simple SVG badge (shields-like minimalist)
msg_len=${#message}
label_len=${#label}
left_w=$(( 6 * label_len + 50 ))
right_w=$(( 8 * msg_len + 40 ))
width=$(( left_w + right_w ))

# Default right color is brightgreen; we'll patch it below to the chosen color.
cat > "$BADGE_FILE" <<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${label}: ${message}">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".7"/>
    <stop offset=".1" stop-opacity=".1"/>
    <stop offset=".9" stop-opacity=".3"/>
    <stop offset="1" stop-opacity=".5"/>
  </linearGradient>
  <mask id="m"><rect width="${width}" height="20" rx="3" fill="#fff"/></mask>
  <g mask="url(#m)">
    <rect width="${left_w}" height="20" fill="#555"/>
    <rect x="${left_w}" width="${right_w}" height="20" fill="#4c1"/>
    <rect width="${width}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="$(( left_w/2 ))" y="15">${label}</text>
    <text x="$(( left_w + right_w/2 ))" y="15">${message}</text>
  </g>
</svg>
SVG

# Map color name to hex
case "$color" in
  brightgreen) hex="#4c1" ;;
  green)       hex="#97CA00" ;;
  yellow)      hex="#dfb317" ;;
  orange)      hex="#fe7d37" ;;
  red)         hex="#e05d44" ;;
  blue)        hex="#007ec6" ;;
  *)           hex="#4c1" ;;
esac

# Patch the right-side rect fill to the chosen color
# macOS/BSD-compatible in-place sed
sed -i.bak "s/fill=\\\"#4c1\\\"/fill=\\\"$hex\\\"/" "$BADGE_FILE" && rm -f "$BADGE_FILE.bak"

echo "Badge written to $BADGE_FILE (checked=$checked, total=$all, percent=$percent%)"
