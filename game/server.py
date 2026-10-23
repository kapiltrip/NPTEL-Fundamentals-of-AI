"""Serve the practice app on this computer, without exposing the repository."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import argparse
import json
import mimetypes

ROOT = Path(__file__).resolve().parent
SOURCES = ROOT.parent / 'resources' / 'screenshots'
PUBLIC_SUFFIXES = {'.html', '.css', '.js', '.mjs', '.json', '.woff', '.woff2', '.ttf', '.txt', '.png', '.jpg', '.jpeg', '.svg'}


class Handler(BaseHTTPRequestHandler):
    def do_HEAD(self):
        self.serve(head=True)

    def do_GET(self):
        self.serve()

    def serve(self, head=False):
        path = unquote(urlsplit(self.path).path)
        if path in ('/', '/game'):
            self.send_response(302)
            self.send_header('Location', '/game/')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return
        if path == '/game/health':
            self.respond(json.dumps({'app': 'nptel-ai-practice', 'version': 1}).encode(), 'application/json', head)
            return
        if not path.startswith('/game/') or '\\' in path:
            self.send_error(404)
            return
        relative = path[len('/game/'):] or 'index.html'
        parts = Path(relative).parts
        if any(part.startswith('.') or part in ('tests', 'tools', '__pycache__') for part in parts):
            self.send_error(404)
            return
        try:
            if relative.startswith('source/'):
                base = SOURCES.resolve()
                target = (base / relative[len('source/'):]).resolve()
                suffixes = {'.png', '.jpg', '.jpeg'}
            else:
                base = ROOT.resolve()
                target = (base / relative).resolve()
                suffixes = PUBLIC_SUFFIXES
            target.relative_to(base)
            if not target.is_file() or target.suffix.lower() not in suffixes:
                self.send_error(404)
                return
            types = {'.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json; charset=utf-8'}
            content_type = types.get(target.suffix) or mimetypes.guess_type(target.name)[0] or 'application/octet-stream'
            self.respond(target.read_bytes(), content_type, head)
        except (ValueError, OSError):
            self.send_error(404)

    def respond(self, body, content_type, head):
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        if not head:
            self.wfile.write(body)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    print(f'AI Practice: http://127.0.0.1:{args.port}/game/', flush=True)
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
