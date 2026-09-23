import urllib.request
import re

url = "https://czmakers.com/product/41673"
req = urllib.request.Request(url, headers={
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
})
resp = urllib.request.urlopen(req)
html = resp.read().decode('utf-8')

table_match = re.search(r'<table class="table table-bordered">.*?<tbody>(.*?)</tbody>', html, re.DOTALL)
if table_match:
    print("Found table!")
    rows_html = table_match.group(1)
    row_pattern = r'<tr>\s*<td[^>]*>(.*?)</td>\s*<td[^>]*>(.*?)</td>\s*</tr>'
    matches = re.findall(row_pattern, rows_html, re.DOTALL)
    print(f"Found {len(matches)} rows")
    for k, v in matches:
        print(f"{k.strip()} : {v.strip()}")
else:
    print("Table not found")
