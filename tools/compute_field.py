#!/usr/bin/env python3
import argparse, json, os, subprocess, sys
from pathlib import Path

def sh(*args):
    cp = subprocess.run(args, capture_output=True, text=True, env=dict(os.environ, LC_ALL="C", TZ="UTC"))
    if cp.returncode != 0:
        sys.stderr.write(cp.stderr or cp.stdout)
        sys.exit(cp.returncode)
    return cp.stdout

def phi_between(script, a, b, norm=False):
    cmd = [sys.executable, str(script), "phi", str(a), str(b)]
    if norm: cmd.append("--norm")
    out = sh(*cmd)
    data = json.loads(out)
    return (float(data["phi"]), float(data.get("phi_norm", 0.0)))

def count_events(node):
    p = Path(node) / "events.jsonl"
    if not p.exists(): return 0
    return sum(1 for _ in p.open("r", encoding="utf-8"))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("nodes", nargs="+", help="node directories")
    ap.add_argument("--label", default="", help="tag/epoch label")
    ap.add_argument("--norm", action="store_true", help="compute normalized metrics too")
    ap.add_argument("--script", default="horizon_ref.py", help="path to horizon_ref.py")
    ap.add_argument("--outdir", default="tools/out", help="output dir for CSV/JSON")
    args = ap.parse_args()

    script = Path(args.script).resolve()
    nodes  = [Path(n).resolve() for n in args.nodes]
    for n in nodes:
        if not (n / "charter.json").exists():
            sys.stderr.write(f"error: missing charter.json in {n}\n")
            sys.exit(1)

    names = [n.name for n in nodes]
    N = len(nodes)
    phi = [[0.0]*N for _ in range(N)]
    phin = [[0.0]*N for _ in range(N)]
    counts = [count_events(n) for n in nodes]

    for i in range(N):
        for j in range(i+1, N):
            raw, normv = phi_between(script, nodes[i], nodes[j], norm=args.norm)
            phi[i][j] = phi[j][i] = raw
            phin[i][j] = phin[j][i] = normv

    Phi = sum(phi[i][j] for i in range(N) for j in range(i+1, N))
    Phi_norm = sum(phin[i][j] for i in range(N) for j in range(i+1, N)) if args.norm else 0.0

    kappa = [0.0]*N
    mean_phi = [0.0]*N
    for i in range(N):
        s = sum(phi[i][j] for j in range(N) if j != i)
        d = N-1 if N>1 else 1
        mean_phi[i] = s / d
        kappa[i] = sum((phi[i][j] - mean_phi[i])**2 for j in range(N) if j != i)

    outdir = Path(args.outdir); outdir.mkdir(parents=True, exist_ok=True)
    with (outdir / "phi_matrix.csv").open("w", encoding="ascii", newline="\n") as f:
        f.write(",".join(["node"] + names) + "\n")
        for i in range(N):
            f.write(",".join([names[i]] + [str(phi[i][j]) for j in range(N)]) + "\n")
    with (outdir / "kappa.csv").open("w", encoding="ascii", newline="\n") as f:
        f.write("node,kappa,degree,mean_phi,event_count\n")
        for i in range(N):
            f.write(f"{names[i]},{kappa[i]},{N-1},{mean_phi[i]},{counts[i]}\n")
    summary = {
        "label": args.label,
        "nodes": names,
        "Phi": Phi,
        **({"Phi_norm": Phi_norm} if args.norm else {}),
        "kappa": {names[i]: kappa[i] for i in range(N)},
        "mean_phi": {names[i]: mean_phi[i] for i in range(N)},
        "event_counts": {names[i]: counts[i] for i in range(N)}
    }
    with (outdir / "summary.json").open("w", encoding="ascii", newline="\n") as f:
        json.dump(summary, f, indent=2, sort_keys=True, ensure_ascii=True); f.write("\n")
    print(json.dumps(summary, sort_keys=True, ensure_ascii=True))

if __name__ == "__main__":
    main()
