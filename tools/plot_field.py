import os, sys
from pathlib import Path

OUT = Path(os.environ.get("OUT", "tools/out"))
phi_path = OUT / "phi_matrix.csv"
kappa_path = OUT / "kappa.csv"

if not phi_path.exists():
    print(f"Error: {phi_path} does not exist. Please generate it before running this script.", file=sys.stderr)
    sys.exit(1)

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
