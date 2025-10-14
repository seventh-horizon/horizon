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
