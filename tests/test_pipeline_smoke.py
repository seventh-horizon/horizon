from pathlib import Path
import csv, os, json, subprocess, sys, shutil
import pytest

TOOLS_OUT = Path("tools/out")
PHI = TOOLS_OUT / "phi_matrix.csv"
KAPPA = TOOLS_OUT / "kappa.csv"

# --- helpers: create minimal inputs the snapshot expects ---

def _ensure_phi_matrix():
    TOOLS_OUT.mkdir(parents=True, exist_ok=True)
    if not PHI.exists():
        # Minimal shape: first column is a label (e.g., "metric"), remaining headers are nodes A,B
        PHI.write_text("metric,A,B\nexample,0.1,0.2\n", encoding="utf-8")

def _ensure_kappa():
    TOOLS_OUT.mkdir(parents=True, exist_ok=True)
    if not KAPPA.exists():
        # Mirror the header shape (metric + A,B) to keep the node list consistent
        KAPPA.write_text("metric,A,B\nexample,0.3,0.4\n", encoding="utf-8")

def _nodes_from_csv(path: Path):
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as f:
        header = next(csv.reader(f), [])
        # header like: ["metric","A","B",...]
        return header[1:] if len(header) > 1 else []

def _derive_nodes():
    # Prefer phi header; fallback to kappa
    nodes = _nodes_from_csv(PHI)
    if not nodes:
        nodes = _nodes_from_csv(KAPPA)
    # Final fallback so the test remains runnable
    return nodes or ["A", "B"]

# --- the smoke test ---

def test_validate_then_snapshot(tmp_path):
    # 1) Create minimal inputs
    _ensure_phi_matrix()
    _ensure_kappa()
    nodes = _derive_nodes()

    # 2) Minimal env expected by snapshot
    env = os.environ.copy()
    env.setdefault("TAG", "epoch_TEST")
    env.setdefault("TAG_DATE", "2099-01-01")
    env.setdefault("EPOCH_ID", env["TAG"])

    # 3) Choose how to invoke snapshot
    if Path("tools/make_snapshot.py").exists():
        cmd = [sys.executable, "tools/make_snapshot.py", "--nodes", *nodes]
    elif shutil.which("make-snapshot"):
        cmd = ["make-snapshot", "--nodes", *nodes]
    else:
        pytest.skip("No make_snapshot.py or make-snapshot command found on this runner")

    proc = subprocess.run(cmd, env=env, capture_output=True, text=True)

    # Show output on failure to aid CI debugging
    if proc.returncode != 0:
        print("=== SNAPSHOT STDOUT ===\n", proc.stdout)
        print("=== SNAPSHOT STDERR ===\n", proc.stderr)

    assert proc.returncode == 0, "Snapshot command failed"

    # 4) Assert a timeline asset was produced
    timeline_dir = Path("public/field/timeline")
    assert timeline_dir.exists(), "timeline dir missing"
    epochs = sorted(timeline_dir.glob("epoch_*.json"))
    assert epochs, "no epoch_*.json produced"
    data = json.loads(epochs[-1].read_text(encoding="utf-8"))
    assert isinstance(data, dict)
