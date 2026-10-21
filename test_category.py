import urllib.request
import urllib.parse
import ssl
import json
import re
import http.cookiejar

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}
with open('data/czm-credentials.json', 'r') as f:
    creds = json.load(f)
ssl_ctx = ssl.create_default_context()
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=ssl_ctx))
req = urllib.request.Request('https://czmakers.com/login', headers=HEADERS)
html = opener.open(req).read().decode('utf-8')
token = re.search(r'name="_token"\s+value="([^"]+)"', html).group(1)
data = urllib.parse.urlencode({'_token': token, 'email': creds['email'], 'password': creds['password']}).encode('utf-8')
post_req = urllib.request.Request('https://czmakers.com/login', data=data, headers=HEADERS)
post_resp = opener.open(post_req)

cat_req = urllib.request.Request('https://czmakers.com/category/necklaces?page=1', headers=HEADERS)
cat_html = opener.open(cat_req).read().decode('utf-8')

selected_curr_m = re.search(r'<option value="[0-9\.]+-([A-Z]+)"\s+selected>', cat_html)
current_currency = selected_curr_m.group(1) if selected_curr_m else "USD"
usd_mult_m = re.search(r'set-session-currency/([0-9\.]+)/USD', cat_html)

print("Category Currency:", current_currency)
print("Multiplier:", usd_mult_m.group(1) if usd_mult_m else "None")
