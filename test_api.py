import urllib.request
import json
try:
    resp = urllib.request.urlopen('http://localhost:8000/api/store-data')
    data = json.loads(resp.read())
    print("Products:", len(data.get('products', [])))
    print("Categories:", len(data.get('categories', [])))
except Exception as e:
    print("ERROR:", e)
