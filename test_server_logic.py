import urllib.request, re, ssl, json, http.cookiejar
ctx = ssl.create_default_context()
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=ctx))
req = urllib.request.Request("https://czmakers.com/product/2564", headers={'User-Agent': 'Mozilla/5.0'})
html = opener.open(req).read().decode('utf-8')
czm_cost = None
m_price = re.search(r'class="[^"]*pdp-single-price[^"]*"[^>]*>[^0-9]*([0-9\.]+)', html)
if m_price and float(m_price.group(1)) > 0:
    raw_price = float(m_price.group(1))
    print("Raw price:", raw_price)
    selected_curr_m = re.search(r'<option value="[0-9\.]+-([A-Z]+)"\s+selected>', html)
    current_currency = selected_curr_m.group(1) if selected_curr_m else "USD"
    if current_currency != "USD":
        usd_mult_m = re.search(r'set-session-currency/([0-9\.]+)/USD', html)
        if usd_mult_m:
            raw_price = raw_price * float(usd_mult_m.group(1))
    czm_cost = round(raw_price, 2)
print("czm_cost:", czm_cost)
