#!/usr/bin/env python3
"""Local dev server that sends the same headers Netlify does.

    python3 tools/serve.py 8000

Use this rather than `python3 -m http.server`. The plain one sends no
Content-Security-Policy, and the deployed site sends a strict one. That gap
hid a real bug: `style="..."` attributes in generated markup are silently
discarded under `style-src 'self'`, so the map-colouring grid collapsed and
the results bars drew at zero width in production while looking perfect on a
local server. Nothing errors; the declaration simply disappears.

Serving the real policy here means that class of bug fails on the laptop.
Keep the CSP string below in step with netlify.toml.
"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

CSP = (
    "default-src 'self'; img-src 'self' data:; style-src 'self'; "
    "script-src 'self'; connect-src 'self'; font-src 'self'; "
    "base-uri 'self'; form-action 'none'; frame-ancestors 'self'"
)


class Handler(SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def end_headers(self):
        # No caching, so an edit is always the thing being tested.
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Content-Security-Policy', CSP)
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def log_message(self, *args):
        pass


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    root = sys.argv[2] if len(sys.argv) > 2 else os.getcwd()
    os.chdir(root)
    ThreadingHTTPServer.allow_reuse_address = True
    print(f'GiftedPrep on http://127.0.0.1:{port}  (with the production CSP)')
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()


if __name__ == '__main__':
    main()
