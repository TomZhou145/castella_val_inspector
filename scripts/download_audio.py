"""Download + cache audio for every unique vid, as mono mp3, capped at its recorded duration.

Re-runnable: skips vids whose mp3 already exists. Logs failures (dead/private/removed
videos) instead of aborting the batch.
"""
import json
import logging
import time
from pathlib import Path

import yt_dlp

ROOT = Path(__file__).parent
VIDS_FILE = ROOT / "vids.json"
CACHE_DIR = ROOT.parent / "audio_cache"
LOG_FILE = ROOT.parent / "download.log"
MP3_BITRATE = "96k"

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.FileHandler(LOG_FILE, mode="a", encoding="utf-8")
handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
logger.addHandler(handler)
logger.addHandler(logging.StreamHandler())


def make_range(end_time):
    def _range(info_dict, ydl):
        return [{"start_time": 0, "end_time": end_time}]

    return _range


def download_one(vid: str, duration: int) -> bool:
    out_path = CACHE_DIR / f"{vid}.mp3"
    if out_path.exists():
        return True

    options = {
        "outtmpl": str(CACHE_DIR / "%(id)s.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "format": "bestaudio/best",
        "download_ranges": make_range(duration),
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": MP3_BITRATE.rstrip("k"),
            }
        ],
        "postprocessor_args": ["-ac", "1"],
    }

    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            ydl.download([vid])
        if out_path.exists():
            logger.info(f"OK {vid}")
            return True
        logger.error(f"FAIL {vid}: no output file produced")
        return False
    except Exception as e:
        logger.error(f"FAIL {vid}: {e}")
        return False


def main():
    CACHE_DIR.mkdir(exist_ok=True)
    vids = json.loads(VIDS_FILE.read_text())
    total = len(vids)
    ok, failed = 0, []

    for i, (vid, duration) in enumerate(vids.items(), 1):
        already_cached = (CACHE_DIR / f"{vid}.mp3").exists()
        success = download_one(vid, duration)
        if success:
            ok += 1
        else:
            failed.append(vid)
        print(f"[{i}/{total}] {vid}: {'cached' if already_cached else ('done' if success else 'FAILED')}")
        if not already_cached:
            time.sleep(1)

    print(f"\n{ok}/{total} cached. {len(failed)} failed.")
    if failed:
        print("Failed vids:", failed)
        (ROOT.parent / "failed_vids.json").write_text(json.dumps(failed, indent=2))


if __name__ == "__main__":
    main()
