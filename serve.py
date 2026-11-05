#!/usr/bin/env python3
"""Shadow — PS4 Jailbreak Host server.

    python serve.py              # port 8000
    python serve.py 8080         # custom port

Serves static files with the headers the PS4 browser needs:
  - text/javascript for .mjs and .js (ES modules)
  - application/octet-stream for .bin payloads
  - text/cache-manifest for .appcache
  - no-cache on code and payloads so updates arrive immediately
  - long cache on images (stale pictures harm nobody)
"""

import json
import os
import socket
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


BINLOADER_PORT = 9090


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".bin": "application/octet-stream",
        ".elf": "application/octet-stream",
        ".appcache": "text/cache-manifest",
        ".mp4": "video/mp4",
        ".m4v": "video/mp4",
        ".sfo": "application/octet-stream",
        ".pkg": "application/octet-stream",
        ".dat": "application/octet-stream",
        ".env": "text/plain",
    }

    CACHEABLE = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".ttf", ".woff", ".woff2")

    def end_headers(self):
        p = self.path.split("?")[0].lower()
        if p.endswith(self.CACHEABLE):
            self.send_header("Cache-Control", "public, max-age=604800")
        else:
            self.send_header("Cache-Control", "no-cache, must-revalidate")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/api/poc/cookie-spray":
            self._handle_cookie_spray()
            return
        super().do_GET()

    def do_POST(self):
        path = self.path.split("?")[0]
        if path == "/api/send-payload":
            self._handle_send_payload()
        elif path == "/api/send-payload-bin":
            self._handle_send_payload_bin()
        else:
            self.send_error(404)

    def _handle_cookie_spray(self):
        from urllib.parse import parse_qs, urlparse
        qs = parse_qs(urlparse(self.path).query)
        n = min(int(qs.get("n", ["10"])[0]), 500)
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        for i in range(n):
            val = "A" * 200
            self.send_header("Set-Cookie", f"spray{i}={val}; Path=/")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(f"sprayed {n} cookies".encode())
        sys.stderr.write(f"[shadow] cookie spray: {n} Set-Cookie headers\n")

    def _handle_send_payload(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length else {}
        except Exception:
            self._json_response(400, {"ok": False, "error": "bad request"})
            return

        payload_file = body.get("file", "")
        if not payload_file or ".." in payload_file:
            self._json_response(400, {"ok": False, "error": "invalid file"})
            return

        full_path = os.path.join(self.directory, payload_file)
        if not os.path.isfile(full_path):
            self._json_response(404, {"ok": False, "error": "payload not found"})
            return

        ps4_ip = self.client_address[0]
        try:
            with open(full_path, "rb") as f:
                data = f.read()
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            sock.connect((ps4_ip, BINLOADER_PORT))
            sock.sendall(data)
            sock.shutdown(socket.SHUT_WR)
            import time; time.sleep(0.5)
            sock.close()
            sys.stderr.write(f"[shadow] sent {len(data)} bytes of {payload_file} to {ps4_ip}:{BINLOADER_PORT}\n")
            self._json_response(200, {"ok": True, "bytes": len(data)})
        except Exception as e:
            sys.stderr.write(f"[shadow] send failed: {e}\n")
            self._json_response(502, {"ok": False, "error": str(e)})

    def _handle_send_payload_bin(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            if length < 4:
                self._json_response(400, {"ok": False, "error": "no data"})
                return
            data = self.rfile.read(length)
        except Exception:
            self._json_response(400, {"ok": False, "error": "bad request"})
            return

        ps4_ip = self.client_address[0]
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            sock.connect((ps4_ip, BINLOADER_PORT))
            sock.sendall(data)
            sock.shutdown(socket.SHUT_WR)
            import time; time.sleep(0.5)
            sock.close()
            sys.stderr.write(f"[shadow] sent {len(data)} bytes (direct) to {ps4_ip}:{BINLOADER_PORT}\n")
            self._json_response(200, {"ok": True, "bytes": len(data)})
        except Exception as e:
            sys.stderr.write(f"[shadow] direct send failed: {e}\n")
            self._json_response(502, {"ok": False, "error": str(e)})

    def _json_response(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("[shadow] %s %s\n" % (self.address_string(), fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = ThreadingHTTPServer(
        ("0.0.0.0", port),
        partial(Handler, directory="."),
    )
    print(f"\n  shadow on http://0.0.0.0:{port}/\n", flush=True)
    print(f"  Open http://<your-ip>:{port}/ on your PS4 browser\n", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
