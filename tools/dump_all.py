import argparse, pathlib, subprocess, os, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
RUNS = ROOT / ".seventh_horizon" / "runs"

def main():
    ap = argparse.ArgumentParser(description="Dump all runs into a single tar.gz")
    ap.add_argument("--out", default="./dump_all_runs.tar.gz", help="output tar.gz")
    ap.add_argument("--include-venv-freeze", action="store_true")
    ap.add_argument("--include-git-status", action="store_true")
    args = ap.parse_args()

    # call dump-run for each epoch_* and pack outputs
    dumps = []
    for d in sorted(RUNS.glob("epoch_*")):
        if not d.is_dir(): continue
        out = f"./dump_{d.name}.tar.gz"
        cmd = [sys.executable, "-m", "tools.dump_run", "--run-id", d.name, "--out", out]
        if args.include_venv_freeze: cmd.append("--include-venv-freeze")
        if args.include_git_status: cmd.append("--include-git-status")
        print("→", " ".join(cmd))
        subprocess.check_call(cmd)
        dumps.append(out)

    # bundle the per-run dumps
    import tarfile
    with tarfile.open(args.out, "w:gz") as tar:
        for f in dumps:
            tar.add(f, arcname=pathlib.Path(f).name)
    print(f"✅ all runs bundle → {pathlib.Path(args.out).resolve()}")

if __name__ == "__main__":
    main()
