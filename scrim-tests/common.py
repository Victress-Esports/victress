"""Shared helpers. Reads keys from ../.env.local if present, else relies on the proxy.
Keys are never printed or logged."""
import json, os, time, urllib.request, urllib.error, pathlib

ROOT = pathlib.Path(__file__).resolve().parent
DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)


def load_env():
    f = ROOT.parent / ".env.local"
    env = {}
    if f.exists():
        for line in f.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


ENV = load_env()
_last = [0.0]


def get(url, header=None, key=None, raw=False, wait=1.0, retries=3):
    """GET with a polite delay. header/key: auth header name and secret (may be None)."""
    for attempt in range(retries):
        dt = time.time() - _last[0]
        if dt < wait:
            time.sleep(wait - dt)
        req = urllib.request.Request(url, headers={"User-Agent": "victress-scrim-tests"})
        if header and key:
            req.add_header(header, key)
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                body = r.read()
                _last[0] = time.time()
                return body if raw else json.loads(body)
        except urllib.error.HTTPError as e:
            _last[0] = time.time()
            if e.code == 429 and attempt < retries - 1:
                time.sleep(int(e.headers.get("Retry-After", "5")) + 1)
                continue
            msg = e.read()[:200].decode("utf-8", "replace")
            raise RuntimeError(f"HTTP {e.code} {url.split('?')[0]} {msg}") from None
