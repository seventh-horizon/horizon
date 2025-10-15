import os
import pathlib
import csv
import subprocess
import pytest

# Ensure plotting inputs exist for the subprocess used in this test
@pytest.fixture(autouse=True, scope="session")
def _ensure_plot_inputs():
    out = pathlib.Path("tools/out")
    out.mkdir(parents=True, exist_ok=True)

    phi = out / "phi_matrix.csv"
    if not phi.exists():
        with phi.open("w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["", "A", "B"])  # header with row label col
            w.writerow(["A", 1.0, 2.0])
            w.writerow(["B", 2.0, 1.0])

    kappa = out / "kappa.csv"
    if not kappa.exists():
        with kappa.open("w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["node", "kappa"])  # simple table
            w.writerow(["A", 0.5])
            w.writerow(["B", 0.7])

    # Point OUT env var to the same directory if the script honors it
    os.environ.setdefault("OUT", str(out.resolve()))

def test_plot_hash_stability(tmp_path):
    # Runs the plotting script; will fail if inputs missing
    subprocess.run(["python3", "tools/plot_field.py"], check=True)
