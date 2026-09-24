import json
with open('data/store-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
print(data.keys())
print("Products count:", len(data.get('products', [])))
