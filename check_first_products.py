import json
with open('data/store-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for p in data['products'][:5]:
    print(p['name'], p['primaryImg'])

print("---HERO---")
for h in data.get('heroSlides', [])[:3]:
    print(h['name'], h['image'])
