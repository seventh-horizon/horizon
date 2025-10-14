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
