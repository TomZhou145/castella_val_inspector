"""Collect the unique {vid: duration} pairs referenced by the CASTELLA val release."""
import json
from pathlib import Path

RELEASE = Path("/Users/tomzhou/Documents/DCASE/dcase2026_task6_baseline/data/castella_val_release.jsonl")
OUT = Path(__file__).parent / "vids.json"


def main():
    vids = {}
    with RELEASE.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            d = json.loads(line)
            vids[d["vid"]] = d["duration"]
    OUT.write_text(json.dumps(vids, indent=2))
    print(f"{len(vids)} unique vids -> {OUT}")


if __name__ == "__main__":
    main()
