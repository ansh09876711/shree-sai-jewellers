# 💎 Shree Sai Jewellers — Premium Customer E-Commerce Website

A production-ready, haute joaillerie customer-facing e-commerce web platform for **Shree Sai Jewellers**. 

The frontend contains **zero hardcoded product, category, banner, review, or offer data** and connects dynamically to a backend Flask REST API backed by PostgreSQL.

---

## 🌟 Architectural Overview

- **Aesthetics**: Luxury royal onyx (`#09080A`), champagne gold gradients, Cormorant Garamond / Cinzel typography, glassmorphism, shimmer skeleton loaders, micro-animations.
- **Dynamic API Layer**: `app.js` features an async `ApiService` with timeout controls, abort controllers, fallback states, and structured error handling.
- **Session & State**:
  - Vault Shopping Cart with item quantity controls, size selection, stock limits, live GST calculation (3%), and coupon validation.
  - Wishlist drawer with one-click transfer to cart.
  - Form validation with error feedback for guest checkout.
- **Payment & Security**:
  - Direct Razorpay Gateway integration (`POST /api/payments/create` -> Razorpay modal -> `POST /api/payments/verify`).
  - No secret keys stored in frontend (only public key in `config.js`).
- **Pages Included**:
  1. `index.html` — Dynamic Home (Hero banner from API, live gold rate ticker, categories, new arrivals, bestsellers, trending, active offers, craftsmanship, verified customer reviews, showroom info, newsletter).
  2. `products.html` — Full Catalog with multi-attribute filtering (category, metal, purity, price range, in-stock toggle), sorting, pagination, and active filter chips.
  3. `product-detail.html` — Haute detail view with multi-image gallery zoom, price breakdowns (gold rate, gross/net weight, making/stone charges, GST), size selectors, stock levels, related items, and verified customer review submissions.
  4. `checkout.html` — Guest checkout with complete address validation, coupon code engine, order summary, and Razorpay payment flow.
  5. `order-success.html` — Order confirmation with summary, payment ID, item breakdown, and delivery estimates.
  6. `order-tracking.html` — Order status tracker with a 9-stage status timeline fetched from `GET /api/orders/<id>`.
  7. `search.html` — Real-time live search with debounced querying and sorting.
  8. `offers.html` — Active promo coupons and sale catalogue.
  9. `about.html` — Brand heritage, craftsmanship story, values, and certifications.
  10. `contact.html` — Contact form (`POST /api/contact`), showroom information, map embed, and VIP concierge booking.

---

## ⚙️ Configuration

All configuration is located in `config.js`:

```javascript
const CONFIG = {
  // Backend Flask API URL
  API_BASE_URL: 'http://127.0.0.1:5000/api',

  // Razorpay Public Key (Never put secret key here)
  RAZORPAY_KEY: 'rzp_test_XXXXXXXXXXXXXXXX',

  // Jewellery GST & Shipping Policies
  GST_RATE: 0.03,                 // 3% Precious Metal / Jewellery GST
  FREE_SHIPPING_THRESHOLD: 50000, // Free insured delivery above ₹50,000
  SHIPPING_FEE: 1500,             // Insured vault express fee below threshold
  PRODUCTS_PER_PAGE: 12,
  SEARCH_DEBOUNCE: 400
};
```

---

## 🔌 Backend REST API Contract

The frontend interacts with the following REST endpoints on `CONFIG.API_BASE_URL`:

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/products` | `GET` | Fetch filtered & paginated products (`?category=...&metal=...&purity=...&min_price=...&max_price=...&in_stock=...&sort=...&page=...&limit=...`) |
| `/api/products/<id>` | `GET` | Single product details with weights, making charges, certificates & images |
| `/api/products/search` | `GET` | Search products by keyword query (`?q=...`) |
| `/api/categories` | `GET` | Active category list with image banners and product counts |
| `/api/banners` | `GET` | Hero banners and promotional slides |
| `/api/offers` | `GET` | Active coupon codes, percentage/flat discounts & validity dates |
| `/api/rates` | `GET` | Live daily market rates for 24K Gold, 22K Gold & Silver 999 |
| `/api/reviews` | `GET` | List approved customer reviews |
| `/api/reviews` | `POST` | Submit a customer product review |
| `/api/coupons/validate` | `POST` | Validate coupon code against subtotal amount (`{ code, order_amount }`) |
| `/api/orders` | `POST` | Create a new customer order (`{ items, shipping_address, ... }`) |
| `/api/orders/<id>` | `GET` | Retrieve live order status, status history & tracking number |
| `/api/payments/create` | `POST` | Generate Razorpay order ID (`{ order_id, amount }`) |
| `/api/payments/verify` | `POST` | Verify Razorpay payment signature (`{ razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id }`) |
| `/api/contact` | `POST` | Submit customer contact / concierge inquiry |
| `/api/newsletter` | `POST` | Subscribe email to newsletter |
| `/api/store-info` | `GET` | Showroom address, hours, contact numbers and maps URL |

---

## 🚀 How to Run

Because this is a pure modern HTML5/CSS3/Vanilla JS application, you can serve it with any web server:

### Option 1: Python
```bash
python -m http.server 8080
```
Then visit `http://localhost:8080` in your browser.

### Option 2: Node.js / NPX
```bash
npx serve .
```

### Option 3: VS Code Live Server
Right-click `index.html` and click **"Open with Live Server"**.

---

## 🔒 Security Compliance

1. **No Sensitive Keys**: Secrets (Razorpay secret, database passwords, mailer API keys) are strictly kept on the Flask backend.
2. **Signature Verification**: Payment success is confirmed only after backend verifies `razorpay_signature`.
3. **Graceful Degeneration**: If the backend is loading or unreachable, elegant shimmer skeleton loaders and helpful retry alerts appear instead of crashing.
