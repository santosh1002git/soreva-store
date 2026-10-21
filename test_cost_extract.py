import urllib.request
import ssl
import json
import re

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

try:
    with open('data/czm-cookie.json', 'r') as f:
        cookie_dict = json.load(f)
        HEADERS['Cookie'] = "; ".join([f"{k}={v}" for k, v in cookie_dict.items()])
except Exception:
    pass

ssl_ctx = ssl.create_default_context()

req = urllib.request.Request("https://czmakers.com/product/2564", headers=HEADERS)
try:
    with urllib.request.urlopen(req, context=ssl_ctx) as resp:
        print("Final URL:", resp.geturl())
        html = resp.read().decode('utf-8', errors='ignore')
        with open('czm_logged_in.html', 'w') as f:
            f.write(html)
except Exception as e:
    print(e)
