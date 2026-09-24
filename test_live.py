import urllib.request
import json

req = urllib.request.Request('http://localhost:8000/api/chat', headers={'Content-Type': 'application/json'}, data=json.dumps({"message": "What about some creative sets?"}).encode('utf-8'))
res = urllib.request.urlopen(req)
print(res.read().decode('utf-8'))
