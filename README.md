# Sorèva Luxury Jewellery Store 💎

Sorèva is a luxury demi-fine and fine jewellery eCommerce storefront and business management suite.

---

## 🏛️ Architecture Overview
- **Storefront & UI**: Responsive Vanilla HTML5, CSS3, and JavaScript (`index.html`, `product.html`, `catalog.html`, `admin.html`, `portal.html`).
- **Backend & REST API**: Python 3 standard library application server (`server.py`) serving static files and API endpoints (`/api/store-data`, `/api/orders`, `/api/auth/*`, `/api/cart/*`, `/api/search`).
- **Database**: Embedded PocketBase / SQLite database (`pb/pb_data/data.db`).
- **Payment Processing**: Integrated Razorpay checkout & webhook verification (`data/razorpay-config.json`).

---

## 🚀 Running Locally

1. **Start the Application Server**:
   ```bash
   python3 server.py 8000
   ```
2. **Start PocketBase (Optional, for database GUI)**:
   ```bash
   cd pb
   ./pocketbase serve --http="127.0.0.1:8090"
   ```
3. **Access URLs**:
   - Storefront: [http://localhost:8000/](http://localhost:8000/)
   - Employee Portal: [http://localhost:8000/portal.html](http://localhost:8000/portal.html)
   - Master Admin: [http://localhost:8000/admin.html](http://localhost:8000/admin.html)
   - PocketBase Studio: [http://localhost:8090/_/](http://localhost:8090/_/)

---

## 🔐 Configuration & Secrets
Copy the example config and add your credentials:
```bash
cp data/razorpay-config.example.json data/razorpay-config.json
```
Fill in your Razorpay `keyId` and `keySecret`. (Sensitive credentials are excluded from Git via `.gitignore`).
