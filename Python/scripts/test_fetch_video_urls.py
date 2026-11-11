"""
Tests for fetch_video_urls.py. Uses a local web server, no internet.

cd Python/scripts && python -m unittest test_fetch_video_urls -v
"""

import contextlib
import csv
import functools
import io
import os
import tempfile
import threading
import unittest
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

import fetch_video_urls as fv

COLUMNS = [
    "video_id", "title", "boxer1", "boxer2", "fight_date", "round", "segment", "camera", "url",
    "external_fight_title", "external_round_id", "external_camera",
]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


class QuietServer(ThreadingHTTPServer):
    # SimpleHTTPRequestHandler ignores Range, so a link check hangs up mid-body.
    def handle_error(self, request, client_address):
        pass


def make_row(url, video_id="vid1", camera="1", title="Bivol v Canelo - R3"):
    return {
        "video_id": video_id, "title": title, "boxer1": "Bivol", "boxer2": "Canelo",
        "fight_date": "2022-05-07", "round": "3", "segment": "Seg 1", "camera": camera, "url": url,
        "external_fight_title": "Bivol_vs_Canelo", "external_round_id": "RD3", "external_camera": "",
    }


def write_csv(path, rows):
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


class FetchVideoUrlsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.served = tempfile.TemporaryDirectory()
        os.makedirs(os.path.join(cls.served.name, "bivol", "r3"))
        cls.video_bytes = os.urandom(3 * fv.CHUNK_BYTES + 17)
        with open(os.path.join(cls.served.name, "bivol", "r3", "cam1.mp4"), "wb") as handle:
            handle.write(cls.video_bytes)
        handler = functools.partial(QuietHandler, directory=cls.served.name)
        cls.server = QuietServer(("127.0.0.1", 0), handler)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.base = f"http://127.0.0.1:{cls.server.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.served.cleanup()

    def setUp(self):
        self.work = tempfile.TemporaryDirectory()
        self.addCleanup(self.work.cleanup)
        self.good = make_row(f"{self.base}/bivol/r3/cam1.mp4")
        self.missing = make_row(f"{self.base}/bivol/r3/cam2.mp4", camera="2")

    def run_main(self, rows, download_dir=None, fight=None):
        csv_path = os.path.join(self.work.name, "video-urls.csv")
        write_csv(csv_path, rows)
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            code = fv.main(csv_path, download_dir, fight, None, 2)
        return code, output.getvalue()

    def test_check_reports_size_and_exit_zero(self):
        code, output = self.run_main([self.good])
        self.assertEqual(code, 0)
        self.assertIn("OK: 1  Failed: 0", output)
        self.assertIn("Total size if downloaded: 3.0 MB", output)

    def test_check_reports_broken_link_and_exit_one(self):
        code, output = self.run_main([self.good, self.missing])
        self.assertEqual(code, 1)
        self.assertIn("FAILED video_id=vid1 camera=2", output)
        self.assertIn("HTTP 404", output)

    def test_download_saves_file_then_skips_on_rerun(self):
        target = os.path.join(self.work.name, "videos")
        code, _ = self.run_main([self.good], download_dir=target)
        self.assertEqual(code, 0)
        saved = fv.download_path(target, self.good)
        with open(saved, "rb") as handle:
            self.assertEqual(handle.read(), self.video_bytes)
        self.assertFalse(os.path.exists(saved + ".part"))

        code, output = self.run_main([self.good], download_dir=target)
        self.assertEqual(code, 0)
        self.assertIn("Already on disk: 1", output)

    def test_failed_download_leaves_no_partial_file(self):
        target = os.path.join(self.work.name, "videos")
        code, _ = self.run_main([self.missing], download_dir=target)
        self.assertEqual(code, 1)
        saved = fv.download_path(target, self.missing)
        self.assertFalse(os.path.exists(saved))
        self.assertFalse(os.path.exists(saved + ".part"))

    def test_fight_filter_matches_title_boxers_and_external_title(self):
        rows = [make_row("u1", title="Bivol v Canelo - R3"), make_row("u2", title="Usyk v Fury - R1")]
        rows[1]["boxer1"], rows[1]["boxer2"], rows[1]["external_fight_title"] = "Usyk", "Fury", "Usyk_vs_Fury"
        self.assertEqual([r["url"] for r in fv.filter_rows(rows, "canelo", None)], ["u1"])
        self.assertEqual([r["url"] for r in fv.filter_rows(rows, "usyk_vs", None)], ["u2"])
        self.assertEqual(len(fv.filter_rows(rows, None, 1)), 1)

    def test_download_path_is_readable_and_unique_per_video(self):
        path = fv.download_path("/out", make_row("https://x/fight-videos/a/cam1.mp4", video_id="abc"))
        self.assertEqual(path, os.path.join("/out", "Bivol_v_Canelo_2022-05-07", "R3_Seg_1_cam1_abc.mp4"))

    def test_size_comes_from_content_range_when_present(self):
        self.assertEqual(fv.total_size_from_headers({"Content-Range": "bytes 0-0/123456"}), 123456)
        self.assertEqual(fv.total_size_from_headers({"Content-Length": "99"}), 99)
        self.assertIsNone(fv.total_size_from_headers({}))

    def test_missing_csv_stops_with_a_clear_message(self):
        with self.assertRaises(SystemExit) as raised:
            fv.read_rows(os.path.join(self.work.name, "nope.csv"))
        self.assertIn("Can't find", str(raised.exception))

    def test_missing_columns_stop_with_a_clear_message(self):
        csv_path = os.path.join(self.work.name, "bad.csv")
        with open(csv_path, "w", encoding="utf-8") as handle:
            handle.write("url\nhttps://x\n")
        with self.assertRaises(SystemExit) as raised:
            fv.read_rows(csv_path)
        self.assertIn("missing columns", str(raised.exception))


if __name__ == "__main__":
    unittest.main()
