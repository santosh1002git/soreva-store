import urllib.request
import re

url = "https://czmakers.com/product/41673"
req = urllib.request.Request(url, headers={
    'User-Agent': 'Mozilla/5.0'
})
resp = urllib.request.urlopen(req)
html = resp.read().decode('utf-8')

# Search for any form inputs
inputs = re.findall(r'<input[^>]*>', html, re.IGNORECASE)
print("Inputs:", len(inputs))
for i in inputs:
    if 'type="hidden"' not in i.lower():
        print(i)

# Check for dropdowns
selects = re.findall(r'<select[^>]*>.*?</select>', html, re.DOTALL | re.IGNORECASE)
print("Selects:", len(selects))

