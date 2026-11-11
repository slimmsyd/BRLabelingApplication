"""
Check or download every video link in a video-urls CSV.

The CSV comes from my-app/scripts/export-video-urls.ts. The links are public,
so no keys, passwords or accounts are needed. Python 3.8+ standard library only.

Check that every link plays and print the total download size:
python fetch_video_urls.py video-urls-2026-11-01.csv

Download every video into a folder (re-running skips finished files):
python fetch_video_urls.py video-urls-2026-11-01.csv --download ./videos

Download only one fight (matches title, boxer names or external fight title):
python fetch_video_urls.py video-urls-2026-11-01.csv --download ./videos --fight "Bivol"

Try the first few rows only:
python fetch_video_urls.py video-urls-2026-11-01.csv --limit 5
"""

from __future__ import annotations

import argparse
import csv
import os
import re
import ssl
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from functools import partial
from typing import Callable, Iterable, List, Optional
from urllib.parse import urlparse

REQUIRED_COLUMNS = ["video_id", "title", "boxer1", "boxer2", "fight_date", "round", "segment", "camera", "url"]
CHUNK_BYTES = 1024 * 1024
TIMEOUT_SECONDS = 60
RETRY_ATTEMPTS = 2
CERT_HINT = (
    "Python could not verify HTTPS certificates. On macOS, run 'Install Certificates.command' "
    "from your Python folder in Applications, or run: pip install certifi"
)


@dataclass
class Result:
    row: dict
    ok: bool
    status: str
    size: Optional[int] = None
    path: Optional[str] = None
    skipped: bool = False


def main(csv_path, download_dir, fight, limit, workers):
    rows = filter_rows(read_rows(csv_path), fight, limit)
    if not rows:
        print("No rows to process. Check the CSV path and the --fight filter.")
        return 2

    context = ssl_context()
    if download_dir:
        print(f"Downloading {len(rows)} videos into {os.path.abspath(download_dir)} with {workers} workers")
        task = partial(download_row, download_dir=download_dir, context=context)
    else:
        print(f"Checking {len(rows)} links with {workers} workers (no files are saved)")
        task = partial(check_row, context=context)

    results = run_all(rows, task, workers, verbose=bool(download_dir))
    print_summary(results, is_download=bool(download_dir))
    return 0 if all(result.ok for result in results) else 1


def read_rows(csv_path) -> List[dict]:
    if not os.path.isfile(csv_path):
        raise SystemExit(f"Can't find {csv_path}. Run this from the folder that has the CSV, or give its full path.")
    with open(csv_path, newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        missing = [column for column in REQUIRED_COLUMNS if column not in (reader.fieldnames or [])]
        if missing:
            raise SystemExit(f"{csv_path} is missing columns: {', '.join(missing)}")
        return [row for row in reader if (row.get("url") or "").strip()]


def filter_rows(rows: Iterable[dict], fight: Optional[str], limit: Optional[int]) -> List[dict]:
    selected = list(rows)
    if fight:
        needle = fight.lower()
        fields = ("title", "boxer1", "boxer2", "external_fight_title")
        selected = [row for row in selected if any(needle in (row.get(field) or "").lower() for field in fields)]
    if limit is not None:
        selected = selected[:limit]
    return selected


def safe_name(text: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", text.strip())
    return cleaned.strip("._") or "unknown"


def download_path(download_dir: str, row: dict) -> str:
    folder = safe_name(f"{row['boxer1']} v {row['boxer2']} {row['fight_date']}")
    extension = os.path.splitext(urlparse(row["url"]).path)[1] or ".mp4"
    filename = safe_name(f"R{row['round']} {row['segment']} cam{row['camera']} {row['video_id']}") + extension
    return os.path.join(download_dir, folder, filename)


def ssl_context() -> ssl.SSLContext:
    try:
        import certifi  # optional; fixes missing CA certificates on some macOS Python installs

        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


def total_size_from_headers(headers) -> Optional[int]:
    content_range = headers.get("Content-Range") or ""
    match = re.search(r"/(\d+)$", content_range)
    if match:
        return int(match.group(1))
    length = headers.get("Content-Length")
    return int(length) if length and length.isdigit() else None


def describe_error(error: Exception) -> str:
    if isinstance(error, urllib.error.HTTPError):
        return f"HTTP {error.code}"
    reason = getattr(error, "reason", error)
    if isinstance(reason, ssl.SSLCertVerificationError):
        return CERT_HINT
    return f"network error: {reason}"


def is_retryable(error: Exception) -> bool:
    if isinstance(error, urllib.error.HTTPError):
        return error.code >= 500
    return not isinstance(getattr(error, "reason", None), ssl.SSLCertVerificationError)


def check_row(row: dict, context: ssl.SSLContext) -> Result:
    request = urllib.request.Request(row["url"], headers={"Range": "bytes=0-0"})
    last_error = None
    for _ in range(RETRY_ATTEMPTS):
        try:
            with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS, context=context) as response:
                return Result(row, ok=True, status=f"HTTP {response.status}", size=total_size_from_headers(response.headers))
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            last_error = error
            if not is_retryable(error):
                break
    return Result(row, ok=False, status=describe_error(last_error))


def download_row(row: dict, download_dir: str, context: ssl.SSLContext) -> Result:
    destination = download_path(download_dir, row)
    if os.path.exists(destination):
        return Result(row, ok=True, status="already downloaded", size=os.path.getsize(destination), path=destination, skipped=True)

    os.makedirs(os.path.dirname(destination), exist_ok=True)
    partial = destination + ".part"
    last_error = None
    for _ in range(RETRY_ATTEMPTS):
        try:
            with urllib.request.urlopen(row["url"], timeout=TIMEOUT_SECONDS, context=context) as response, open(partial, "wb") as handle:
                while True:
                    chunk = response.read(CHUNK_BYTES)
                    if not chunk:
                        break
                    handle.write(chunk)
            os.replace(partial, destination)
            return Result(row, ok=True, status="downloaded", size=os.path.getsize(destination), path=destination)
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            last_error = error
            if os.path.exists(partial):
                os.remove(partial)
            if not is_retryable(error):
                break
    return Result(row, ok=False, status=describe_error(last_error), path=destination)


def run_all(rows: List[dict], task: Callable[[dict], Result], workers: int, verbose: bool) -> List[Result]:
    results: List[Result] = []
    with ThreadPoolExecutor(max_workers=max(1, workers)) as pool:
        futures = [pool.submit(task, row) for row in rows]
        for future in as_completed(futures):
            results.append(future.result())
            report_progress(results[-1], len(results), len(rows), verbose)
    return results


def report_progress(result: Result, done: int, total: int, verbose: bool):
    label = f"{result.row['title']} cam {result.row['camera']}"
    if not result.ok:
        print(f"[{done}/{total}] FAILED {label}: {result.status}")
    elif verbose:
        print(f"[{done}/{total}] {result.status} {label} ({format_bytes(result.size)})")
    elif done % 100 == 0 or done == total:
        print(f"[{done}/{total}] checked")


def format_bytes(size: Optional[int]) -> str:
    if size is None:
        return "size unknown"
    if size < 1024:
        return f"{size} B"
    value = float(size)
    for unit in ("KB", "MB", "GB", "TB"):
        value /= 1024
        if value < 1024 or unit == "TB":
            break
    return f"{value:.1f} {unit}"


def print_summary(results: List[Result], is_download: bool):
    failed = [result for result in results if not result.ok]
    sized = [result.size for result in results if result.ok and result.size is not None]
    print("")
    print(f"OK: {len(results) - len(failed)}  Failed: {len(failed)}  Total: {len(results)}")
    if is_download:
        skipped = sum(1 for result in results if result.skipped)
        print(f"Downloaded: {len(results) - len(failed) - skipped}  Already on disk: {skipped}  Size on disk: {format_bytes(sum(sized))}")
    else:
        print(f"Total size if downloaded: {format_bytes(sum(sized))}")
    for result in failed:
        row = result.row
        print(f"  FAILED video_id={row['video_id']} camera={row['camera']} {row['title']}: {result.status}")


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description="Check or download every video link in a video-urls CSV.")
    parser.add_argument("csv_path", help="CSV from my-app/scripts/export-video-urls.ts")
    parser.add_argument("--download", metavar="FOLDER", help="Save each video under FOLDER instead of only checking links")
    parser.add_argument("--fight", help="Only rows whose title, boxer names or external fight title contain this text")
    parser.add_argument("--limit", type=int, help="Only the first N rows (after --fight)")
    parser.add_argument("--workers", type=int, help="Parallel requests (default 8 for checks, 3 for downloads)")
    return parser.parse_args(argv)


if __name__ == "__main__":
    args = parse_args()
    worker_count = args.workers or (3 if args.download else 8)
    sys.exit(main(args.csv_path, args.download, args.fight, args.limit, worker_count))
