"""Merge the CASTELLA val ground truth + N prediction result sets into one static index.json
consumed by the frontend. Re-run whenever a prediction file changes."""
import json
from pathlib import Path

BASE = Path("/Users/tomzhou/Documents/DCASE/dcase2026_task6_baseline")
RELEASE = BASE / "data" / "castella_val_release.jsonl"

# name -> path, shown in the frontend's model selector in this order
MODELS = {
    "baseline": BASE / "tom_results" / "Model_1_my_baseline" / "8_16_model_1" / "best_castella_val_preds.jsonl",
    "decay": BASE / "tom_results" / "experiment_1" / "decay" / "best_castella_val_preds.jsonl",
    "reg": BASE / "tom_results" / "experiment_1" / "reg" / "best_castella_val_preds.jsonl",
    "highlr": BASE / "tom_results" / "experiment_1" / "highlr" / "best_castella_val_preds.jsonl",
}

OUT = Path(__file__).parent.parent / "web" / "public" / "index.json"


def load_jsonl(path):
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def main():
    gt = load_jsonl(RELEASE)

    qids = {}
    videos = {}
    for row in gt:
        qid, vid = row["qid"], row["vid"]
        qids[qid] = {
            "vid": vid,
            "query": row["query"],
            "duration": row["duration"],
            "gt_windows": row["relevant_windows"],
            "preds": {},
        }
        videos.setdefault(vid, {"duration": row["duration"], "qids": []})
        videos[vid]["qids"].append(qid)

    missing = {name: 0 for name in MODELS}
    for name, path in MODELS.items():
        if not path.exists():
            print(f"WARNING: {name} predictions not found at {path}, skipping")
            continue
        preds = load_jsonl(path)
        seen = set()
        for row in preds:
            qid = row["qid"]
            seen.add(qid)
            if qid not in qids:
                print(f"WARNING: {name} has qid {qid} not in GT release, skipping row")
                continue
            qids[qid]["preds"][name] = row["pred_relevant_windows"]
        missing[name] = len(qids) - len(seen)

    for name, count in missing.items():
        if count:
            print(f"NOTE: {name} is missing predictions for {count} qids")

    index = {
        "models": list(MODELS.keys()),
        "videos": videos,
        "qids": qids,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(index))
    print(f"{len(qids)} qids across {len(videos)} videos -> {OUT}")


if __name__ == "__main__":
    main()
