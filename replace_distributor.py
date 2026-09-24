import json

files = ['data/store-data.json', 'data/store-data.backup.json']
for filename in files:
    try:
        with open(filename, 'r') as f:
            data = f.read()
        
        # Replace the badge and description text
        data = data.replace("Distributor Catalog", "Sorèva Exclusive")
        data = data.replace("distributor catalog", "Sorèva collection")
        data = data.replace("Distributor Model:", "Sorèva Model:")
        
        with open(filename, 'w') as f:
            f.write(data)
    except FileNotFoundError:
        pass

with open('app.js', 'r') as f:
    app_data = f.read()
app_data = app_data.replace("Distributor Catalog", "Sorèva Exclusive")
app_data = app_data.replace("distributor catalog", "Sorèva collection")
with open('app.js', 'w') as f:
    f.write(app_data)
    
