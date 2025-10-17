from pathlib import Path
import csv, os, json, subprocess, sys, shutil
import pytest

# --- helpers ---

def _ensure_phi_matrix():
    """Create a minimal tools/out/phi_matrix.csv so make-snapshot can run in CI."""
    phi = Path("tools/out/phi_matrix.csv")
    phi.parent.mkdir(parents=True, exist_ok=True)
    if not phi.exists():
        # Minimal, valid CSV: first row is header: metric plus node names (A,B)
        phi.write_text("metric,A,B\nexample,0.1,0.2\n", encoding="utf-8")

def _nodes_from_phi():
    p = Path("tools/out/phi_matrix.csv")
    if not p.exists():
        return []
    with p.open(newline="", encoding="utf-8") as f:
        row = next(csv.reader(f), [])
        # header looks like: ["metric","A","B",...]
        return row[1:] if len(row) > 1 else []

# --- the actual smoke test ---

def test_validate_then_snapshot(tmp_path):
    # 1) ensure input exists + pick nodes from header
    _ensure_phi_matrix()
    nodes = _nodes_from_phi() or ["A", "B"]

    # 2) minimal env expected by snapshot
    env = os.environ.copy()
    env.setdefault("TAG", "epoch_TEST")
    env.setdefault("TAG_DATE", "2099-01-01")
    env.setdefault("EPOCH_ID", env["TAG"])

    # 3) choose how to invoke snapshot
    # Prefer the Python script if it exists; otherwise use console script if present.
    if Path("tools/make_snapshot.py").exists():
        cmd = [sys.executable, "tools/make_snapshot.py", "--nodes", *nodes]
    elif shutil.which("make-snapshot"):
        cmd = ["make-snapshot", "--nodes", *nodes]
    else:
        pytest.skip("No make_snapshot.py or make-snapshot command found")

    proc = subprocess.run(cmd, env=env, capture_output=True, text=True)

    # Helpful failure printout
    if proc.returncode != 0:
        print("STDOUT:\n", proc.stdout)
        print("STDERR:\n", proc.stderr)

    assert proc.returncode == 0, "Snapshot command failed"

    # 4) assert an epoch_*.json timeline file was created
    timeline_dir = Path("public/field/timeline")
    assert timeline_dir.exists(), "timeline dir missing"
    epochs = sorted(timeline_dir.glob("epoch_*.json"))
    assert epochs, "no epoch_*.json produced"
    data = json.loads(epochs[-1].read_text(encoding="utf-8"))
    assert isinstance(data, dict)
