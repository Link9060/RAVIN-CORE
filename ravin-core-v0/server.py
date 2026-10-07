#!/usr/bin/env python3
import json
import os
import socket
import urllib.request
import urllib.error
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

PORT = int(os.environ.get('RAVIN_PORT', '8765'))
ROOT = Path(__file__).resolve().parent / 'www'
RAVIN_API_URL = os.environ.get('RAVIN_API_URL', '').strip()
RAVIN_API_TOKEN = os.environ.get('RAVIN_API_TOKEN', '').strip()


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        return s.getsockname()[0]
    except OSError:
        return 'YOUR-MAC-IP'
    finally:
        s.close()


def local_demo_reply(message: str) -> str:
    m = message.strip().lower()
    if not m:
        return "I didn't catch anything."
    if m in {'hi', 'hello', 'hey', 'ravin'}:
        return "Yeah? I'm here."
    if 'who are you' in m:
        return "I'm RAVIN Core, running through your Mac right now."
    if 'status' in m:
        return "Core link is online. Your phone is connected to the Mac server."
    return (
        "Core link works. I received: “" + message.strip() + "”. "
        "Connect your RAVIN backend in server.py to replace demo mode with the real brain."
    )


def ravin_reply(message: str, history: list) -> str:
    if not RAVIN_API_URL:
        return local_demo_reply(message)

    payload = json.dumps({
        'message': message,
        'history': history,
        'source': 'ravin-core-v0'
    }).encode('utf-8')

    headers = {'Content-Type': 'application/json'}
    if RAVIN_API_TOKEN:
        headers['Authorization'] = f'Bearer {RAVIN_API_TOKEN}'

    req = urllib.request.Request(RAVIN_API_URL, data=payload, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=45) as res:
            data = json.loads(res.read().decode('utf-8'))
            # Accept a few common response shapes.
            for key in ('reply', 'response', 'message', 'text', 'content'):
                value = data.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()
            return 'RAVIN backend replied, but I could not find text in its response.'
    except urllib.error.HTTPError as e:
        return f'RAVIN backend error {e.code}.'
    except Exception as e:
        return f'RAVIN backend is unreachable: {type(e).__name__}.'


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format, *args):
        print('[Core]', format % args)

    def do_POST(self):
        if self.path != '/api/message':
            self.send_error(404)
            return

        try:
            length = int(self.headers.get('Content-Length', '0'))
            body = json.loads(self.rfile.read(length).decode('utf-8'))
            message = str(body.get('message', ''))[:4000]
            history = body.get('history', [])
            if not isinstance(history, list):
                history = []
            reply = ravin_reply(message, history[-12:])
            out = json.dumps({'reply': reply}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(out)))
            self.end_headers()
            self.wfile.write(out)
        except Exception as e:
            out = json.dumps({'reply': f'Core server error: {type(e).__name__}'}).encode('utf-8')
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(out)))
            self.end_headers()
            self.wfile.write(out)


if __name__ == '__main__':
    ip = lan_ip()
    print('\nRAVIN CORE v0')
    print('---------------------------')
    print(f'Mac:   http://127.0.0.1:{PORT}')
    print(f'Phone: http://{ip}:{PORT}')
    print('Keep this Terminal window open.\n')
    ThreadingHTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
