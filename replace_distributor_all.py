import json

files = ['data/czmakers_all_products.json', 'app_recovered_auto.js']
for filename in files:
    try:
        with open(filename, 'r') as f:
            data = f.read()
        
        data = data.replace("Distributor Catalog", "Sorèva Exclusive")
        data = data.replace("distributor catalog", "Sorèva collection")
        data = data.replace("Distributor Model:", "Sorèva Model:")
        
        with open(filename, 'w') as f:
            f.write(data)
    except FileNotFoundError:
        pass

