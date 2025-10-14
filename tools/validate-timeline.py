#!/usr/bin/env python3
import json, os, re, sys, hashlib, subprocess
from pathlib import Path
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from tools.constants import EPS

FIELD_DIR = Path("public/field/timeline")

def err(msg):
    print(f"ERROR: {msg}", file=sys.stderr); sys.exit(1)

def main():
    idxp = Path("public/field/timeline.index.json")
    if not idxp.exists():
        err("timeline.index.json not found")
    idx = json.loads(idxp.read_text(encoding="ascii"))
    tags = idx.get("tags") or []
    if not isinstance(tags, list) or not tags:
        err("timeline.index.json: tags[] empty")

    def _semv(t: str):
        m = re.findall(r"\d+", t)
        a = [int(x) for x in m[:3]] + [0, 0, 0]
        return tuple(a[:3])
    seen = set()
    prev = (0, 0, 0)
    for entry in tags:
        tagname = entry.get("tag") or ""
        v = _semv(tagname)
        if v < prev:
            err(f"non-monotonic tag order: {tagname}")
        if tagname in seen:
            err(f"duplicate tag in index: {tagname}")
        seen.add(tagname)
        prev = v
        phi_idx = entry.get("Phi")
        if phi_idx is not None and float(phi_idx) < 0:
            err(f"negative Phi in index entry for {tagname}")

    indexed = [t.get("tag") for t in tags if t.get("tag")]
    want = set(indexed)
    actual = set(p.stem for p in (FIELD_DIR.glob("v*.json")))
    missing = sorted(want - actual)
    if missing:
        err(f"missing snapshots for indexed tags: {', '.join(missing)}")
    stray = sorted(actual - want)
    if stray:
        err(f"snapshots not listed in index: {', '.join(stray)}")

    chain = hashlib.sha256("\n".join(entry["snapshot_sha256"] for entry in tags).encode("ascii")).hexdigest()
    if chain != idx.get("chain_root"):
        err("chain_root mismatch")

    for tag in indexed:
        snap_path = FIELD_DIR / f"{tag}.json"
        snap = json.loads(snap_path.read_text(encoding="ascii"))
        if snap.get("tag") != tag:
            err(f"{snap_path}: tag mismatch")
        nodes = snap.get("nodes") or []
        D = snap.get("phi_matrix") or []
        if not nodes or not D or len(D) != len(nodes) or any(len(row)!=len(nodes) for row in D):
            err(f"{snap_path}: phi_matrix shape mismatch with nodes")
        n = len(nodes)
        for i in range(n):
            if abs(float(D[i][i])) > EPS:
                err(f"{snap_path}: phi_matrix diagonal non-zero at ({i},{i})")
            for j in range(i+1, n):
                a = float(D[i][j]); b = float(D[j][i])
                if a < 0.0 or b < 0.0:
                    err(f"{snap_path}: negative phi at ({i},{j}) or ({j},{i})")
                if a != b:
                    err(f"{snap_path}: asymmetry phi[{i},{j}]={a} vs phi[{j},{i}]={b}")

    print("TIMELINE VALIDATION: ALL GREEN")

if __name__ == "__main__":
    main()
