/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // 1. Products Collection
  const products = new Collection({
    type: "base",
    name: "products",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "category", type: "text" },
      { name: "subCategory", type: "text" },
      { name: "priceINR", type: "number" },
      { name: "originalPriceINR", type: "number" },
      { name: "rating", type: "number" },
      { name: "reviews", type: "number" },
      { name: "plating", type: "text" },
      { name: "badge", type: "text" },
      { name: "primaryImg", type: "text" },
      { name: "hoverImg", type: "text" },
      { name: "description", type: "text" }
    ]
  });
  app.save(products);

  // 2. Inventory Collection
  const inventory = new Collection({
    type: "base",
    name: "inventory",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      { name: "sku", type: "text", required: true },
      { name: "productName", type: "text", required: true },
      { name: "category", type: "text" },
      { name: "stockQty", type: "number" },
      { name: "lowStockThreshold", type: "number" },
      { name: "status", type: "text" }
    ]
  });
  app.save(inventory);

  // 3. Customers Collection
  const customers = new Collection({
    type: "base",
    name: "customers",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "email", type: "text", required: true },
      { name: "phone", type: "text" },
      { name: "city", type: "text" },
      { name: "address", type: "text" },
      { name: "totalOrders", type: "number" },
      { name: "totalSpent", type: "number" }
    ]
  });
  app.save(customers);

  // 4. Orders Collection
  const orders = new Collection({
    type: "base",
    name: "orders",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      { name: "orderNumber", type: "text", required: true },
      { name: "customerName", type: "text", required: true },
      { name: "customerEmail", type: "text", required: true },
      { name: "customerPhone", type: "text" },
      { name: "shippingAddress", type: "text" },
      { name: "city", type: "text" },
      { name: "itemsSummary", type: "text" },
      { name: "totalAmount", type: "number" },
      { name: "paymentMethod", type: "text" },
      { name: "status", type: "text" }
    ]
  });
  app.save(orders);
}, (app) => {
  const collections = ["orders", "customers", "inventory", "products"];
  for (const name of collections) {
    try {
      const col = app.findCollectionByNameOrId(name);
      app.delete(col);
    } catch (e) {}
  }
})
