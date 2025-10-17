# tests/test_pipeline_smoke.py (helpers)

from pathlib import Path
import os
import sys
import subprocess

OUT_DIR = Path("tools/out")
OUT_DIR.mkdir(parents=True, exist_ok=True)

def _write_square_matrix_csv(path: Path, nodes: list[str], offdiag: float = 0.1) -> None:
    n = len(nodes)
    # pure numeric n×n matrix, no header row/col
    lines = []
    for i in range(n):
        row = [(0.0 if i == j else offdiag) for j in range(n)]
        lines.append(",".join(str(x) for x in row))
    path.write_text("\n".join(lines), encoding="utf-8")

def _ensure_phi_matrix(nodes: list[str]) -> None:
    _write_square_matrix_csv(OUT_DIR / "phi_matrix.csv", nodes, offdiag=0.2)

def _ensure_kappa(nodes: list[str]) -> None:
    _write_square_matrix_csv(OUT_DIR / "kappa.csv", nodes, offdiag=0.5)

def _derive_nodes() -> list[str]:
    # Use the same nodes you will pass to the CLI
    return ["A", "B", "C"]

def test_validate_then_snapshot(tmp_path):
    nodes = _derive_nodes()
    _ensure_phi_matrix(nodes)
    _ensure_kappa(nodes)

    env = os.environ.copy()
    env.setdefault("TAG", "epoch_TEST")
    env.setdefault("TAG_DATE", "2099-01-01")
    env.setdefault("EPOCH_ID", env["TAG"])

    cmd = [sys.executable, "tools/make_snapshot.py", "--nodes", *nodes]
    proc = subprocess.run(cmd, env=env, capture_output=True, text=True)

    if proc.returncode != 0:
        print("=== SNAPSHOT STDOUT ===\n", proc.stdout)
        print("=== SNAPSHOT STDERR ===\n", proc.stderr)
    assert proc.returncode == 0, "Snapshot command failed"