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
opener.open(post_req)

# Try setting currency using a generic multiplier
try:
    opener.open(urllib.request.Request("https://czmakers.com/set-session-currency/0.012/USD", headers=HEADERS))
except:
    pass

product_req = urllib.request.Request('https://czmakers.com/product/2564', headers=HEADERS)
product_html = opener.open(product_req).read().decode('utf-8')
m_price = re.search(r'class="[^"]*pdp-single-price[^"]*"[^>]*>[^0-9]*([0-9\.]+)', product_html)
print("USD Price:", m_price.group(1) if m_price else "None")
