#!/usr/bin/env bash
set -euo pipefail
umask 022; export LC_ALL=C LANG=C TZ=UTC

# VEL schema (stub)
if [ ! -f vel/VEL_MANIFEST.schema.json ]; then
  cat > vel/VEL_MANIFEST.schema.json <<'JSON'
{"$schema":"http://json-schema.org/draft-07/schema#","title":"VEL Manifest","type":"object",
 "required":["version","root_hash","files"],
 "properties":{"version":{"type":"string"},
   "root_hash":{"type":"string","pattern":"^[0-9a-f]{64}$"},
   "files":{"type":"array","minItems":1,"items":{"type":"object","required":["path","sha256"],
     "properties":{"path":{"type":"string"},"sha256":{"type":"string","pattern":"^[0-9a-f]{64}$"}}}}}}
JSON
  echo "Added vel/VEL_MANIFEST.schema.json"
fi

# Repro auditor (minimal)
mkdir -p repro-pack
if [ ! -f repro-pack/repro_auditor.py ]; then
  cat > repro-pack/repro_auditor.py <<'PY'
#!/usr/bin/env python3
import argparse, hashlib, json
from pathlib import Path
LEDGER = Path("repro-pack/ledger.json")
def sha(p:Path):
  h=hashlib.sha256()
  with p.open("rb") as f:
    for b in iter(lambda:f.read(1<<20), b""): h.update(b)
  return h.hexdigest()
def walk():
  skip=(".git/","dist/","node_modules/",".next/",".nox/")
  for p in sorted(Path(".").rglob("*")):
    s=str(p)
    if p.is_file() and not any(s.startswith(k) for k in skip): yield p
def main():
  ap=argparse.ArgumentParser(); ap.add_argument("--check",action="store_true"); ap.add_argument("--update",action="store_true")
  a=ap.parse_args()
  cur={str(p):sha(p) for p in walk()}
  if a.update: LEDGER.write_text(json.dumps(cur,sort_keys=True,indent=2,ensure_ascii=True)+"\n","ascii"); print("ledger updated"); return
  if not LEDGER.exists(): print("ledger missing; run --update"); raise SystemExit(2)
  ref=json.loads(LEDGER.read_text("ascii"))
  if a.check and ref!=cur:
    diff={"added":sorted(set(cur)-set(ref)),"removed":sorted(set(ref)-set(cur)),
          "changed":sorted(k for k in set(ref)&set(cur) if ref[k]!=cur[k])}
    print(json.dumps(diff,indent=2)); raise SystemExit(1)
  print("ok")
if __name__=="__main__": main()
PY
  chmod 0755 repro-pack/repro_auditor.py
  echo "Added repro-pack/repro_auditor.py"
fi

# horizon_ref.py (placeholder used by tools/compute_field.py)
if [ ! -f horizon_ref.py ]; then
  cat > horizon_ref.py <<'PY'
#!/usr/bin/env python3
import sys,json
# Usage: horizon_ref.py phi NODE_A NODE_B [--norm]
if len(sys.argv)<4: print("usage: horizon_ref.py phi A B [--norm]",file=sys.stderr); sys.exit(2)
a,b=sys.argv[2],sys.argv[3]
seed=(sum(map(ord,(a+"|"+b)))%101)/10.0
out={"phi":seed}
if "--norm" in sys.argv: out["phi_norm"]=seed/max(1.0,len(a)+len(b))
print(json.dumps(out,ensure_ascii=True))
PY
  chmod 0755 horizon_ref.py
  echo "Added horizon_ref.py (stub)"
fi

echo "Doctor complete."
