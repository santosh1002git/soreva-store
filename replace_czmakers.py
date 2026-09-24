import json

files = ['data/store-data.json', 'data/store-data.backup.json', 'data/czmakers_all_products.json', 'app.js', 'app_recovered_auto.js']
for filename in files:
    try:
        with open(filename, 'r') as f:
            data = f.read()
        
        # Replace variations of CZ Makers
        data = data.replace("CZ Makers", "Sorèva")
        data = data.replace("CZ makers", "Sorèva")
        data = data.replace("cz makers", "Sorèva")
        data = data.replace("CZ-Makers", "Sorèva")
        
        with open(filename, 'w') as f:
            f.write(data)
    except FileNotFoundError:
        pass

