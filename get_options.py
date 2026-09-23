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

# Search for select, radios, or any div mentioning color/finish/plating
for match in re.findall(r'<select[^>]*name="color"[^>]*>(.*?)</select>', html, re.DOTALL | re.IGNORECASE):
    options = re.findall(r'<option[^>]*>(.*?)</option>', match, re.DOTALL | re.IGNORECASE)
    print("Found Color Options in select:", [o.strip() for o in options])

for match in re.findall(r'<div[^>]*class="[^"]*color[^"]*"[^>]*>(.*?)</div>', html, re.DOTALL | re.IGNORECASE):
    pass # this might be too broad

# Let's check if the word 'Gold' or 'Rhodium' is in labels
labels = re.findall(r'<label[^>]*>(.*?)</label>', html, re.DOTALL)
print("Labels:", [l.strip() for l in labels if l.strip()])

# Search for variations
variations = re.findall(r'<input[^>]*type="radio"[^>]*name="color_id"[^>]*>(.*?)<', html, re.IGNORECASE)
if variations:
    print("Radio variations:", [v.strip() for v in variations])

