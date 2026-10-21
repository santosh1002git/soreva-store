import urllib.request
import json
import ssl
import http.cookiejar

HEADERS = {
    'User-Agent': 'Mozilla/5.0',
}
with open('data/czm-credentials.json', 'r') as f:
    creds = json.load(f)

ctx = ssl.create_default_context()
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=ctx))

# First login
import urllib.parse, re
req = urllib.request.Request('https://czmakers.com/login', headers=HEADERS)
html = opener.open(req).read().decode('utf-8')
token = re.search(r'name="_token"\s+value="([^"]+)"', html).group(1)
data = urllib.parse.urlencode({'_token': token, 'email': creds['email'], 'password': creds['password']}).encode('utf-8')
req = urllib.request.Request('https://czmakers.com/login', data=data, headers=HEADERS)
html = opener.open(req).read().decode('utf-8')

# Set currency to USD explicitly by hitting the link found in html
usd_mult_m = re.search(r'set-session-currency/([0-9\.]+)/USD', html)
if usd_mult_m:
    usd_url = f"https://czmakers.com/set-session-currency/{usd_mult_m.group(1)}/USD"
    opener.open(urllib.request.Request(usd_url, headers={'User-Agent': 'Mozilla/5.0'})) # Maybe needs more headers?

    # Wait, let's just make the request but it requires X-Requested-With for API? No it's an ahref.
    # Ah, the link is just a normal link.
    
# Let's fetch the product page again
req = urllib.request.Request('https://czmakers.com/product/2564', headers=HEADERS)
html = opener.open(req).read().decode('utf-8')
m_price = re.search(r'class="[^"]*pdp-single-price[^"]*"[^>]*>[^0-9]*([0-9\.]+)', html)
print("Product price after attempting USD switch:", m_price.group(1) if m_price else "None")
print("Selected currency:", re.search(r'<option value="[0-9\.]+-([A-Z]+)"\s+selected>', html).group(1) if re.search(r'<option value="[0-9\.]+-([A-Z]+)"\s+selected>', html) else "None")
