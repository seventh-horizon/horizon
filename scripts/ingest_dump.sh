#!/usr/bin/env bash
set -euo pipefail
umask 022; export LC_ALL=C LANG=C TZ=UTC
tmp="$(mktemp)"; trap 'rm -f "$tmp"' EXIT
cat > "$tmp"

# If dump includes "# path: ..." markers, respect them and write files
if LC_ALL=C grep -qE -- '^#\s*path:\s+' "$tmp"; then
  awk '
    BEGIN{fname="";}
    /^# path:[[:space:]]+/ {
      if (fname!="") close(fname);
      fname=$0; sub(/^# path:[[:space:]]+/, "", fname);
      system("mkdir -p \"" gensub(/\/[^\/]+$/,"",1,fname) "\"");
      print "" > fname; next
    }
    { if (fname!="") print $0 >> fname; }
  ' "$tmp"
else
  # Otherwise classify whole dump and file it to the right module
  meta="$(python3 tools/dump_classifier.py < "$tmp")"
  target="$(echo "$meta" | sed -n 's/.*"target":"\([^"]*\)".*/\1/p')"
  case "$target" in
    observatory-operator)      path="observatory-operator/README_DROP.md" ;;
    observatory-operator-lite) path="observatory-operator-lite/README_DROP.md" ;;
    vel)                       path="vel/README_DROP.md" ;;
    repro-pack)                path="repro-pack/README_DROP.md" ;;
    scripts)                   path="scripts/DROP.sh" ;;
    .github/workflows)         path=".github/workflows/drop.yml" ;;
    app/observer)              path="app/observer/timeline/DROP.txt" ;;
    tools)                     path="tools/DROP.txt" ;;
    *)                         path="drops/DROP.txt"; mkdir -p drops ;;
  esac
  mkdir -p "$(dirname "$path")"
  cp "$tmp" "$path"
fi

# Normalize LF and enforce ASCII; set exec on scripts
while IFS= read -r -d '' f; do
  # strip CR if any
  if LC_ALL=C grep -q -- $'\r' "$f"; then tr -d '\r' < "$f" > "$f.tmp" && mv "$f.tmp" "$f"; fi
  # ASCII check
  # Fail on any byte outside the printable ASCII range 0x20–0x7E
if LC_ALL=C grep -qE -- '[^ -~]' "$f"; then
  echo "Non-ASCII in $f" >&2
  exit 1
fi
  case "$f" in *.sh|scripts/*.py|tools/*.py) chmod 0755 "$f" ;; esac
done < <(find . -type f -not -path "./.git/*" -print0)

echo "OK: dump ingested."
