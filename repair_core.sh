#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'; umask 022
export LC_ALL=C LANG=C TZ=UTC

mkdir -p tools scripts tests public/field/timeline app/observer/timeline

# .gitattributes / .gitignore (safe defaults)
[ -f .gitattributes ] || cat > .gitattributes <<'GITA'
* text=auto eol=lf
*.png binary
*.jpg binary
*.gif binary
*.pdf binary
*.ico binary
# SVG is text; keep it under ASCII lint
GITA

[ -f .gitignore ] || cat > .gitignore <<'GITIG'
out/
!.keep
.nox/
coverage.xml
*.tgz
*.tar.gz
*.zip
keys/*.key
dist/
node_modules/
.next/
.env
GITIG

# tools/constants.py
mkdir -p tools
cat > tools/constants.py <<'PY'
# ASCII-only constants used across tools
EPS = 1e-12
PY

# tools/mds_tie_break.py
cat > tools/mds_tie_break.py <<'PY'
#!/usr/bin/env python3
import hashlib, math
import numpy as np

def _hash_scalar(s):
    d = hashlib.sha256(s.encode("ascii")).digest()
    return int.from_bytes(d[:8], "big", signed=False) / (2**64 - 1)

def _probe(names):
    g = np.array([_hash_scalar(n) for n in names], dtype=float)
    g = g - g.mean()
    n = np.linalg.norm(g)
    return g / n if n > 0 else np.full(len(names), 1.0/len(names))

def deterministic_rotate_first_snapshot(X, names):
    g = _probe(names)
    a = X.T @ g
    a_norm = float(np.linalg.norm(a))
    if a_norm < 1e-15:
        a = X.T @ _probe(list(reversed(names)))
        a_norm = float(np.linalg.norm(a))
        if a_norm < 1e-15:
            Y = X.copy()
            Y[np.abs(Y) < 1e-12] = 0.0
            return Y
    ax, ay = (a / a_norm)
    theta = math.atan2(ay, ax)
    c, s = math.cos(-theta), math.sin(-theta)
    R = np.array([[c, -s],[s, c]])
    Y = X @ R
    b = (Y.T @ (np.arange(X.shape[0]) - (X.shape[0]-1)/2.0))
    if b[1] < 0:
        Y[:,1] *= -1.0
    Y[np.abs(Y) < 1e-12] = 0.0
    return Y
PY
chmod 0755 tools/mds_tie_break.py

# tools/embedding.py
cat > tools/embedding.py <<'PY'
import numpy as np
from .mds_tie_break import deterministic_rotate_first_snapshot
from .constants import EPS

def _err_scaled(Z, prev):
    denom = float((Z * Z).sum()) or 1.0
    s = float((Z * prev).sum()) / denom
    if s < 0: s = -s
    return float(((s * Z - prev) ** 2).sum())

def _double_center(D):
    n = D.shape[0]
    J = np.eye(n) - np.ones((n, n))/n
    return -0.5 * J @ (D**2) @ J

def _sign_fix(X):
    Y = X.copy()
    for j in range(Y.shape[1]):
        col = Y[:, j]
        k = int(np.argmax(np.abs(col)))
        if col[k] < 0:
            Y[:, j] = -col
    return Y

def _axis_lock8(Y, prev_coords, nodes):
    if not prev_coords:
        return Y
    idx = [i for i, n in enumerate(nodes) if n in prev_coords]
    if len(idx) < 2:
        return Y
    prev = np.array([[prev_coords[nodes[i]][0], prev_coords[nodes[i]][1]] for i in idx], float)
    Ysub = Y[idx, :]
    best_err, best = float("inf"), Y
    for swap in (False, True):
        Z0 = (Ysub[:, [1,0]] if swap else Ysub)
        for sx in (1.0, -1.0):
            for sy in (1.0, -1.0):
                Z = Z0 * np.array([sx, sy])
                err = _err_scaled(Z, prev)
                if err < best_err:
                    best_err = err
                    best = (Y[:, [1,0]] if swap else Y) * np.array([sx, sy])
    return best

def deterministic_mds_2d(D, nodes, prev=None):
    import math
    nodes = list(nodes)
    n = len(nodes)
    M = np.array(D, dtype=float)
    if n == 0:
        return {}
    if n == 1:
        return {nodes[0]: [0.0, 0.0]}
    B = _double_center(M)
    w, V = np.linalg.eigh(B)
    idx = np.argsort(w)[::-1]
    w2 = np.clip(w[idx][:2], 0, None)
    V2 = V[:, idx][:, :2]
    L = np.diag(np.sqrt(w2))
    X = V2 @ L
    X = _sign_fix(X)
    if prev:
        X = _axis_lock8(X, prev, nodes)
    else:
        X = deterministic_rotate_first_snapshot(X, nodes)
    X[np.abs(X) < EPS] = 0.0
    out = {}
    for i, name in enumerate(nodes):
        out[name] = [float(f"{X[i, 0]:.4f}"), float(f"{X[i, 1]:.4f}")]
    return out
PY

# tools/compute_field.py
cat > tools/compute_field.py <<'PY'
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
PY
chmod 0755 tools/compute_field.py

# tools/plot_field.py
cat > tools/plot_field.py <<'PY'
#!/usr/bin/env python3
import os, csv, glob, json, tempfile
os.environ["LC_ALL"]="C"; os.environ["TZ"]="UTC"
os.environ["MPLCONFIGDIR"]=tempfile.mkdtemp(prefix="mplcfg_")

import matplotlib
matplotlib.use("Agg")
matplotlib.rcParams["path.simplify"] = False
matplotlib.rcParams["figure.autolayout"] = False
matplotlib.rcParams["font.family"] = ["DejaVu Sans"]

import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path

OUT = Path("tools/out")
OUT.mkdir(parents=True, exist_ok=True)

def _save(fig, path):
    fig.savefig(path, dpi=120, metadata={"Software": "HorizonPlot/1"}, bbox_inches=None)
    plt.close(fig)

# φ heatmap
with (OUT / "phi_matrix.csv").open() as f:
    r = list(csv.reader(f))
nodes, data = r[0][1:], np.array([[float(x) for x in row[1:]] for row in r[1:]])
fig, ax = plt.subplots()
im = ax.imshow(data, cmap="viridis")
ax.set_xticks(range(len(nodes))); ax.set_yticks(range(len(nodes)))
ax.set_xticklabels(nodes, rotation=90); ax.set_yticklabels(nodes)
ax.set_title("Pairwise Drift φ"); fig.colorbar(im, ax=ax)
fig.tight_layout(); _save(fig, OUT / "phi_heatmap.png")

# κ bar chart
kappa, nodes2 = [], []
with (OUT / "kappa.csv").open() as f:
    next(f)
    for row in csv.reader(f):
        nodes2.append(row[0]); kappa.append(float(row[1]))
fig, ax = plt.subplots()
ax.bar(nodes2, kappa)
ax.set_title("Curvature κ per Node"); ax.set_ylabel("κ"); ax.set_xlabel("Node")
fig.tight_layout(); _save(fig, OUT / "kappa_bar.png")

# Φ over time
summaries = sorted(glob.glob(str(OUT / "summary*.json")))
if summaries:
    labels, Phi = [], []
    for s in summaries:
        d = json.load(open(s))
        labels.append(d.get("label") or Path(s).stem)
        Phi.append(float(d["Phi"]))
    fig, ax = plt.subplots()
    ax.plot(range(len(Phi)), Phi, marker="o")
    ax.set_xticks(range(len(Phi))); ax.set_xticklabels(labels, rotation=45, ha="right")
    ax.set_ylabel("Φ"); ax.set_xlabel("Snapshot")
    ax.set_title("Global Drift Φ over Time")
    fig.tight_layout(); _save(fig, OUT / "phi_trend.png")
PY
chmod 0755 tools/plot_field.py

# tools/make_snapshot.py
cat > tools/make_snapshot.py <<'PY'
#!/usr/bin/env python3
import csv, json, os, sys, hashlib
from pathlib import Path
from .embedding import deterministic_mds_2d

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
PY
chmod 0755 tools/make_snapshot.py

# tools/build_timeline_index.py
cat > tools/build_timeline_index.py <<'PY'
#!/usr/bin/env python3
import json, re, hashlib
from pathlib import Path

FIELD = Path("public/field/timeline")

def semver_key(tag: str) -> tuple[int,int,int]:
    m = re.findall(r"\d+", tag); t = [int(x) for x in m[:3]] + [0,0,0]
    return tuple(t[:3])

def sha256_file(p: Path) -> str:
    import hashlib
    return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    snaps = []
    for p in sorted(FIELD.glob("v*.json")):
        data = json.loads(p.read_text(encoding="ascii"))
        snaps.append({
            "tag": data["tag"],
            "sha": "",
            "tag_date_utc": data["tag_date_utc"],
            "snapshot_sha256": sha256_file(p),
            "Phi": float(data["Phi"])
        })
    snaps.sort(key=lambda x: semver_key(x["tag"]))
    chain = hashlib.sha256("\n".join(s["snapshot_sha256"] for s in snaps).encode("ascii")).hexdigest()
    index = {"version": 1, "tags": snaps, "chain_root": chain}
    out = FIELD.parent/"timeline.index.json"
    out.write_text(json.dumps(index, sort_keys=True, ensure_ascii=True, indent=2)+"\n", encoding="ascii")
    print(out)

if __name__ == "__main__":
    main()
PY
chmod 0755 tools/build_timeline_index.py

# tools/validate_timeline.py
cat > tools/validate_timeline.py <<'PY'
#!/usr/bin/env python3
import json, os, re, sys, hashlib, subprocess
from pathlib import Path
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
PY
chmod 0755 tools/validate_timeline.py

# tests/test_plots_hash.py (determinism test)
mkdir -p tests
cat > tests/test_plots_hash.py <<'PY'
import hashlib, subprocess, pathlib

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def test_plot_hash_stability(tmp_path):
    out = pathlib.Path("tools/out")
    subprocess.run(["python3", "tools/plot_field.py"], check=True)
    hashes1 = {p.name: sha(p) for p in out.glob("*.png")}
    assert hashes1, "no plots produced"
    subprocess.run(["python3", "tools/plot_field.py"], check=True)
    hashes2 = {p.name: sha(p) for p in out.glob("*.png")}
    assert hashes1 == hashes2, f"PNG hash drift: {hashes1} != {hashes2}"
PY

echo "repair_core: created tools/*, tests/*, and basics."
