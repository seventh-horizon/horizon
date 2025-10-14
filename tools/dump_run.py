import argparse, os, sys, tarfile, subprocess, datetime, re, pathlib, shutil, json

ROOT = pathlib.Path(__file__).resolve().parents[1]
RUNS = ROOT / ".seventh_horizon" / "runs"

REDACT = [
    (re.compile(r'(?i)(api[_-]?key|token|secret|password)\s*=\s*[^ \n]+'), r'\1=REDACTED'),
    (re.compile(r'(?i)bearer\s+[A-Za-z0-9\._\-]+'), 'bearer REDACTED'),
]

def _safe(text: str) -> str:
    for rx, repl in REDACT:
        text = rx.sub(repl, text)
    return text

def _cmd(args, cwd=None):
    try:
        return subprocess.check_output(args, cwd=cwd, stderr=subprocess.STDOUT, text=True)
    except Exception as e:
        return f"[cmd error {args!r}: {e}]"

def _write(path: pathlib.Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")

def find_run(run_id: str|None):
    import os
    if run_id:
        p = RUNS / run_id
        if not p.exists():
            raise SystemExit(f"Run not found: {p}")
        return p
    env_id = os.environ.get('EPOCH_ID') or os.environ.get('TAG')
    if env_id:
        p = RUNS / env_id
        if p.exists():
            return p
        if not p.exists():
            sys.exit(f"Run not found: {p}")
        return p
    # latest symlink
    latest = RUNS / "latest"
    if latest.is_symlink():
        return latest.resolve()
    # else pick most recent epoch_* dir
    epochs = sorted((d for d in RUNS.glob("epoch_*") if d.is_dir()), reverse=True)
    if not epochs:
        sys.exit("No runs found.")
    return epochs[0]

def make_archive(src_dir: pathlib.Path, out_path: pathlib.Path):
    with tarfile.open(out_path, "w:gz") as tar:
        tar.add(src_dir, arcname=src_dir.name)

def main():
    ap = argparse.ArgumentParser(description="Dump a Seventh Horizon run into a redacted tar.gz")
    ap.add_argument("--run-id", help="epoch_* folder name; defaults to latest")
    ap.add_argument("--out", help="output file path; default ./dump_<RUN_ID>.tar.gz")
    ap.add_argument("--include-venv-freeze", action="store_true", help="capture pip freeze from current venv")
    ap.add_argument("--include-git-status", action="store_true", help="capture git status/dirty state")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    run_dir = find_run(args.run_id)
    run_id = run_dir.name
    out = pathlib.Path(args.out) if args.out else pathlib.Path(f"./dump_{run_id}.tar.gz")

    # Build a temp export dir
    tmp = pathlib.Path(f"./.dump_tmp_{run_id}")
    if tmp.exists(): shutil.rmtree(tmp)
    tmp.mkdir(parents=True, exist_ok=True)

    # Copy run dir
    export_run = tmp / run_dir.name
    shutil.copytree(run_dir, export_run)

    # Capture environment snapshot
    env_txt = "\n".join(f"{k}={v}" for k,v in sorted(os.environ.items()))
    _write(tmp / "env.txt", _safe(env_txt))

    # System + Python info
    sysinfo = []
    sysinfo.append(_cmd(["uname","-a"]))
    sysinfo.append(_cmd([sys.executable, "-V"]))
    sysinfo.append(_cmd([sys.executable, "-c", "import sys,platform;print(platform.platform());print(sys.version)"]))
    _write(tmp / "system.txt", "\n".join(sysinfo))

    # Optional: pip freeze
    if args.include_venv_freeze:
        _write(tmp / "pip_freeze.txt", _cmd([sys.executable, "-m", "pip", "freeze"]))

    # Optional: git status
    if args.include_git_status:
        git = []
        git.append(_cmd(["git","rev-parse","--abbrev-ref","HEAD"]))
        git.append(_cmd(["git","rev-parse","--short","HEAD"]))
        git.append(_cmd(["git","status","--porcelain=v1"]))
        _write(tmp / "git_status.txt", _safe("\n".join(git)))

    # Redact stdall.log copy just in case
    log = export_run / "stdall.log"
    if log.exists():
        log.write_text(_safe(log.read_text(encoding="utf-8")), encoding="utf-8")

    out = out.resolve()
    if out.exists() and not args.force:
        sys.exit(f"Refusing to overwrite existing {out}. Use --force to override.")
    make_archive(tmp, out)
    shutil.rmtree(tmp)
    print(f"✅ dump created → {out}")

if __name__ == "__main__":
    main()
