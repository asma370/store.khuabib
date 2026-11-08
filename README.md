# ⚔️ Khubaib — Streetwear Brand Website & Backend

A luxury brutalist streetwear e-commerce experience featuring an exact CSS 3D clothing rail hero, catalog, shopping bag, checkout system, and a custom Node.js REST API backend.

---

## 📁 Folder Structure (`Desktop\clothing website`)

```
clothing website/
├── index.html          # Main website (3D Hero + Catalog + Bag + Checkout + Modals)
├── server.js           # Node.js REST API server (Products, Orders, Contact, Newsletter)
├── run-server.bat      # One-click launcher: starts server & opens http://localhost:3000
├── open-website.bat    # Direct launcher: opens index.html in your default browser
├── README.md           # Documentation & guide
└── data/
    ├── products.json   # 10 Streetwear garments with stock per size (XS-XXL)
    ├── orders.json     # Saved customer orders & tracking numbers
    ├── messages.json   # Contact inquiries received from users
    └── subscribers.json# VIP drop newsletter subscriber emails
```

---

## 🚀 How to Run (Chalane Ka Tareeqa)

### Option 1: Run with Backend Server (Recommended)
1. Open the folder **`clothing website`** on your Desktop.
2. Double-click **`run-server.bat`**.
3. It will automatically start the backend server and open **`http://localhost:3000`** in your browser!

### Option 2: Open Directly (Without Server)
1. Double-click **`open-website.bat`** (or open `index.html` in any browser).
2. The website will load seamlessly with full client-side cart, size selection, 3D rail, and checkout receipts!

---

## ✨ Key Features (Website Ke Features)

1. **Signature 3D Clothing Rail Hero**:
   - Gothic blackletter logo **`Khubaib`** in UnifrakturMaguntia.
   - Polished chrome rail with 5-stop lighting reflections.
   - 10 Streetwear garments hanging edge-on in real CSS 3D (`rotateY(-74deg)` under `perspective: 900px`).
   - Hover swings garment flat (`rotateY(0deg)`) while neighbors slide 86px left and right.
   - Click lifts garment in 750ms into high-res detail spotlight with prev/next chevrons, size selector, and counter.
   - Red marquee banner scrolling `KHUBAIB • LIMITED RUN • NO RESTOCKS •`.

2. **Full Streetwear Catalog ("The Drop 01")**:
   - Category filtering: `All`, `Tees`, `Longsleeves`, `Hoodies`, `Jackets`.
   - Dynamic currency selector (`EUR €`, `USD $`, `GBP £`, `PKR ₨`).
   - "3D Rail" button: spotlights any item directly on the 3D clothing rail!

3. **Size Selector & Shopping Bag**:
   - Live size buttons (`XS`, `S`, `M`, `L`, `XL`, `XXL`) with inventory tracking.
   - Slide-out Cart Drawer with quantity controls (`-` / `+`) and item removal.
   - Promo Code support: try typing **`KHUBAIB10`** for 10% off or **`DROP01`** for 15% off!
   - Free shipping calculation on orders above €100.

4. **Checkout System & Confirmation Receipt**:
   - Full Name, Email, Phone, and Delivery Address inputs.
   - Payment selection: Credit/Debit Card, Cash on Delivery (COD), Apple Pay, Crypto (BTC).
   - Generates instant order receipt with tracking ID (e.g. `KB-84920`).

5. **REST API Backend (`server.js`)**:
   - `GET /api/products` — Returns all garments & size inventory.
   - `GET /api/products/:id` — Single product details.
   - `POST /api/orders` — Validates stock, saves order to `data/orders.json`, deducts inventory.
   - `GET /api/orders` — View placed orders.
   - `POST /api/contact` — Saves studio inquiries to `data/messages.json`.
   - `POST /api/newsletter` — Saves VIP drop emails to `data/subscribers.json`.
   - `POST /api/cart/validate` — Server-side coupon & stock calculation.
