import json
with open('data/store-data.json', 'r') as f:
    data = json.load(f)
print(data.get('heroSlides', [])[0])
