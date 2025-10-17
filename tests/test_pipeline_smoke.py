import subprocess, json, os, pathlib

def run(cmd, **kwargs):
    return subprocess.check_output(cmd, text=True, **kwargs)

def test_validate_then_snapshot(tmp_path):
    # run validator (no env needed)
    run(["validate-timeline"])

    # set minimal env that the snapshot tool expects
    env = os.environ.copy()
    env.setdefault("TAG", "epoch_TEST")
    env.setdefault("TAG_DATE", "2099-01-01")
    env.setdefault("EPOCH_ID", env["TAG"])

    # run snapshot
    run(["make-snapshot","--nodes","A","B","C"], env=env)

    # assert latest timeline exists
    p = pathlib.Path("public/field/timeline")
    assert p.exists()
    latest = sorted(p.glob("epoch_*.json"))[-1]
    data = json.loads(latest.read_text())
    assert isinstance(data, dict)
