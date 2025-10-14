#!/usr/bin/env python3
import csv, json, os, sys, hashlib
from pathlib import Path
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from tools.embedding import deterministic_mds_2d


TAG = os.environ.get("TAG") or sys.exit("TAG not set")
TAG_DATE = os.environ.get("TAG_DATE") or sys.exit("TAG_DATE not set")

FIELD_DIR = Path("public/field/timeline")
FIELD_DIR.mkdir(parents=True, exist_ok=True)

def _round4(x: float) -> float:
    return float(f"{x:.4f}")

def read_phi_matrix(path: Path):
    r = list(csv.reader(path.open()))
    nodes = r[0][1:]
    data = [[float(x) for x in row[1:]] for row in r[1:]]
    return nodes, data

def read_kappa(path: Path):
    out = {}
    with path.open() as f:
        next(f)
        for row in csv.reader(f):
            out[row[0]] = _round4(float(row[1]))
    return out

def mean_phi_per_node(nodes, D):
    n = len(nodes); out = {}
    for i, name in enumerate(nodes):
        s = sum(D[i][j] for j in range(n) if j != i)
        denom = max(1, n-1)
        out[name] = _round4(s/denom)
    return out

def phi_global(D):
    n = len(D); s = 0.0
    for i in range(n):
        for j in range(i+1, n):
            s += D[i][j]
    return _round4(s)

def phi_norm_global(D, counts):
    n = len(D); s = 0.0
    for i in range(n):
        for j in range(i+1, n):
            denom = max(counts[i], counts[j], 1)
            s += D[i][j]/denom
    return _round4(s)

def event_counts(nodes):
    counts = []
    for n in nodes:
        p = Path(n)/"events.jsonl"
        counts.append(sum(1 for _ in p.open(encoding="utf-8")) if p.exists() else 0)
    return counts

def read_prev_embed(prev_path: Path):
    if not prev_path or not prev_path.exists():
        return {}
    data = json.loads(prev_path.read_text(encoding="ascii"))
    return data.get("embed", {})

def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--nodes", nargs="+", required=True)
    ap.add_argument("--phi", default="tools/out/phi_matrix.csv")
    ap.add_argument("--kappa", default="tools/out/kappa.csv")
    ap.add_argument("--summary", default="tools/out/summary.json")
    ap.add_argument("--prev", default="")
    args = ap.parse_args()

    nodes, D = read_phi_matrix(Path(args.phi))
    if nodes != args.nodes:
        sys.exit(f"node order mismatch: CSV={nodes} != CLI={args.nodes}")

    K = read_kappa(Path(args.kappa))
    counts = event_counts(nodes)

    Phi = phi_global(D)
    Phi_norm = None
    if Path(args.summary).exists():
        try:
            s = json.loads(Path(args.summary).read_text(encoding="ascii"))
            val = float(s.get("Phi_norm"))
            Phi_norm = _round4(val)
        except Exception:
            Phi_norm = None
    if Phi_norm is None:
        Phi_norm = phi_norm_global(D, counts)

    mean_phi = mean_phi_per_node(nodes, D)
    prev = read_prev_embed(Path(args.prev)) if args.prev else {}
    embed = deterministic_mds_2d(D, nodes, prev=prev)

    snapshot = {
        "tag": TAG,
        "tag_date_utc": TAG_DATE,
        "nodes": nodes,
        "Phi": Phi,
        "Phi_norm": Phi_norm,
        "kappa": {k: _round4(float(K.get(k, 0.0))) for k in nodes},
        "mean_phi": mean_phi,
        "event_counts": {nodes[i]: counts[i] for i in range(len(nodes))},
        "phi_matrix": [[_round4(v) for v in row] for row in D],
        "embed": embed
    }

    out = FIELD_DIR/f"{TAG}.json"
    out.write_text(json.dumps(snapshot, sort_keys=True, ensure_ascii=True, indent=2)+"\n", encoding="ascii")
    print(out)

if __name__ == "__main__":
    main()
