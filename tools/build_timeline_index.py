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
