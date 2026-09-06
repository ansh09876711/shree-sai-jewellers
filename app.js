/* ==========================================================================
   SHREE SAI JEWELLERS — CORE APPLICATION ENGINE
   API-driven: Zero hardcoded product/category/offer data.
   All content is fetched from the Flask REST backend.
   ========================================================================== */

'use strict';

/* --------------------------------------------------------------------------
   1. API SERVICE — All backend communication
   -------------------------------------------------------------------------- */
const ApiService = {
  _cache: new Map(),

  async request(endpoint, options = {}, useCache = false) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    const cacheKey = url + JSON.stringify(options);

    if (useCache && this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        signal: controller.signal,
        ...options,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Server error' }));
        throw new ApiError(response.status, errorBody.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (useCache) this._cache.set(cacheKey, data);
      return data;

    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') throw new ApiError(0, 'Request timed out. Please check your connection.');
      if (err instanceof ApiError) throw err;
      throw new ApiError(0, 'Unable to connect to the server. Please try again.');
    }
  },

  // Products
  getProducts(params = {})     { return this.request('/products?' + new URLSearchParams(params)); },
  getProduct(id)               { return this.request(`/products/${id}`, {}, true); },
  searchProducts(query, params)  { return this.request('/products/search?' + new URLSearchParams({ q: query, ...params })); },

  // Categories
  getCategories()              { return this.request('/categories', {}, false); },

  // Banners & Offers
  getBanners()                 { return this.request('/banners', {}, true); },
  getOffers()                  { return this.request('/offers', {}, true); },

  // Rates
  getRates()                   { return this.request('/rates', {}, true); },

  // Reviews
  getReviews(params = {})      { return this.request('/reviews?' + new URLSearchParams(params)); },
  submitReview(data)           { return this.request('/reviews', { method: 'POST', body: JSON.stringify(data) }); },

  // Orders & Payments
  createOrder(data)            { return this.request('/orders', { method: 'POST', body: JSON.stringify(data) }); },
  getOrder(id)                 { return this.request(`/orders/${id}`); },
  createPayment(data)          { return this.request('/payments/create', { method: 'POST', body: JSON.stringify(data) }); },
  verifyPayment(data)          { return this.request('/payments/verify', { method: 'POST', body: JSON.stringify(data) }); },

  // Coupons
  validateCoupon(code, amount) { return this.request('/coupons/validate', { method: 'POST', body: JSON.stringify({ code, order_amount: amount }) }); },

  // Contact & Newsletter
  submitContact(data)          { return this.request('/contact', { method: 'POST', body: JSON.stringify(data) }); },
  subscribeNewsletter(email)   { return this.request('/newsletter', { method: 'POST', body: JSON.stringify({ email }) }); },

  // Store info
  getStoreInfo()               { return this.request('/store-info', {}, true); },

  // Auth
  login(data)                  { return this.request('/auth/login', { method: 'POST', body: JSON.stringify(data), credentials: 'include' }); },
  register(data)               { return this.request('/auth/register', { method: 'POST', body: JSON.stringify(data), credentials: 'include' }); },
  logout()                     { return this.request('/auth/logout', { method: 'POST', credentials: 'include' }); },
  getMe()                      { return this.request('/auth/me', { credentials: 'include' }); },
};

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/* --------------------------------------------------------------------------
   2. STATE MANAGER — Cart, Wishlist, Guest Info
   -------------------------------------------------------------------------- */
const State = {
  cart: [],
  wishlist: [],
  guestInfo: {},
  appliedCoupon: null,

  init() {
    this.cart     = this._load(CONFIG.STORAGE_KEYS.CART)     || [];
    this.wishlist = this._load(CONFIG.STORAGE_KEYS.WISHLIST) || [];
    this.guestInfo = this._load(CONFIG.STORAGE_KEYS.GUEST_INFO) || {};
  },

  save() {
    this._store(CONFIG.STORAGE_KEYS.CART,       this.cart);
    this._store(CONFIG.STORAGE_KEYS.WISHLIST,   this.wishlist);
    this._store(CONFIG.STORAGE_KEYS.GUEST_INFO, this.guestInfo);
  },

  _load(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },

  _store(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* storage full */ }
  },
};

/* --------------------------------------------------------------------------
   3. CART ENGINE
   -------------------------------------------------------------------------- */
const Cart = {
  getItems()   { return State.cart; },
  getCount()   { return State.cart.reduce((s, i) => s + i.quantity, 0); },

  getSubtotal() {
    return State.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
  },

  getDiscount() {
    const coupon = State.appliedCoupon;
    if (!coupon) return 0;
    const sub = this.getSubtotal();
    if (coupon.flat_discount) {
      return coupon.min_order && sub < coupon.min_order ? 0 : coupon.flat_discount;
    }
    if (coupon.discount_percent) {
      const disc = sub * (coupon.discount_percent / 100);
      return coupon.max_discount ? Math.min(disc, coupon.max_discount) : disc;
    }
    return 0;
  },

  getGST() {
    return (this.getSubtotal() - this.getDiscount()) * CONFIG.GST_RATE;
  },

  getShipping() {
    const afterDiscount = this.getSubtotal() - this.getDiscount();
    return afterDiscount >= CONFIG.FREE_SHIPPING_THRESHOLD ? 0 : CONFIG.SHIPPING_FEE;
  },

  getTotal() {
    return this.getSubtotal() - this.getDiscount() + this.getGST() + this.getShipping();
  },

  addItem(product, quantity = 1, selectedSize = null) {
    const key = `${product.id}_${selectedSize || 'default'}`;
    const existing = State.cart.find(i => i._key === key);

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > product.stock) {
        Toast.show(`Only ${product.stock} in stock`, 'warning');
        return false;
      }
      existing.quantity = newQty;
    } else {
      if (product.stock < 1) {
        Toast.show('This item is out of stock', 'error');
        return false;
      }
      State.cart.push({
        _key: key,
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || product.image || '',
        metal: product.metal || '',
        purity: product.purity || '',
        stock: product.stock,
        selectedSize,
        quantity,
      });
    }

    State.save();
    updateCartBadge();
    Toast.show(`${product.name.substring(0, 30)}… added to cart`, 'gold', '🛍️');
    return true;
  },

  removeItem(key) {
    State.cart = State.cart.filter(i => i._key !== key);
    State.save();
    updateCartBadge();
  },

  updateQty(key, delta) {
    const item = State.cart.find(i => i._key === key);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty < 1) {
      this.removeItem(key);
      return;
    }
    if (newQty > item.stock) {
      Toast.show(`Only ${item.stock} units available`, 'warning');
      return;
    }
    item.quantity = newQty;
    State.save();
  },

  clear() {
    State.cart = [];
    State.appliedCoupon = null;
    State.save();
    updateCartBadge();
  },

  async applyCoupon(code) {
    if (!code.trim()) { Toast.show('Enter a coupon code', 'warning'); return; }
    try {
      const result = await ApiService.validateCoupon(code.trim().toUpperCase(), this.getSubtotal());
      State.appliedCoupon = result.coupon;
      State.save();
      Toast.show(result.coupon.description || 'Coupon applied!', 'success', '🎉');
      return result.coupon;
    } catch (err) {
      State.appliedCoupon = null;
      Toast.show(err.message || 'Invalid coupon code', 'error');
      return null;
    }
  },

  removeCoupon() {
    State.appliedCoupon = null;
    Toast.show('Coupon removed', 'info');
  },
};

/* --------------------------------------------------------------------------
   4. WISHLIST ENGINE
   -------------------------------------------------------------------------- */
const Wishlist = {
  getItems()        { return State.wishlist; },
  getCount()        { return State.wishlist.length; },
  isWishlisted(id)  { return State.wishlist.some(i => i.id === id); },

  toggle(product) {
    if (this.isWishlisted(product.id)) {
      State.wishlist = State.wishlist.filter(i => i.id !== product.id);
      Toast.show('Removed from wishlist', 'info', '💔');
    } else {
      State.wishlist.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || product.image || '',
        metal: product.metal || '',
        purity: product.purity || '',
        stock: product.stock,
      });
      Toast.show('Added to wishlist', 'success', '❤️');
    }
    State.save();
    updateWishlistBadge();
    syncWishlistButtons(product.id);
  },

  moveToCart(productId) {
    const item = State.wishlist.find(i => i.id === productId);
    if (!item) return;
    Cart.addItem(item);
    State.wishlist = State.wishlist.filter(i => i.id !== productId);
    State.save();
    updateWishlistBadge();
  },
};

/* --------------------------------------------------------------------------
   5. TOAST NOTIFICATION SYSTEM
   -------------------------------------------------------------------------- */
const Toast = {
  container: null,

  init() {
    if (!document.getElementById('toastContainer')) {
      this.container = document.createElement('div');
      this.container.id = 'toastContainer';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toastContainer');
    }
  },

  show(message, type = 'info', icon = null) {
    if (!this.container) this.init();
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️', gold: '✨' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icon || icons[type] || icons.info}</span>
      <span class="toast-msg">${message}</span>
    `;
    this.container.appendChild(toast);
    requestAnimationFrame(() => { requestAnimationFrame(() => toast.classList.add('show')); });
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  },
};

/* --------------------------------------------------------------------------
   6. SKELETON LOADER UTILITIES
   -------------------------------------------------------------------------- */
const Skeleton = {
  productCard(count = 4) {
    return Array.from({ length: count }, () => `
      <div class="skeleton-card">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton-body">
          <div class="skeleton skeleton-line short"></div>
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-line medium"></div>
          <div class="skeleton skeleton-price"></div>
        </div>
      </div>
    `).join('');
  },

  categoryCard(count = 6) {
    return Array.from({ length: count }, () => `
      <div class="skeleton skeleton-card" style="aspect-ratio:3/4; border-radius:var(--radius-xl);"></div>
    `).join('');
  },

  reviewCard(count = 3) {
    return Array.from({ length: count }, () => `
      <div class="skeleton-card" style="padding:var(--sp-6);">
        <div class="skeleton skeleton-line short" style="margin-bottom:var(--sp-3);"></div>
        <div class="skeleton skeleton-line full" style="margin-bottom:var(--sp-2);"></div>
        <div class="skeleton skeleton-line medium"></div>
      </div>
    `).join('');
  },
};

/* --------------------------------------------------------------------------
   7. UI BADGE & COUNTER HELPERS
   -------------------------------------------------------------------------- */
function updateCartBadge() {
  document.querySelectorAll('.cart-count').forEach(el => {
    const count = Cart.getCount();
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

function updateWishlistBadge() {
  document.querySelectorAll('.wishlist-count').forEach(el => {
    const count = Wishlist.getCount();
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

function syncWishlistButtons(productId) {
  const wishlisted = Wishlist.isWishlisted(productId);
  document.querySelectorAll(`[data-wishlist-id="${productId}"]`).forEach(btn => {
    btn.classList.toggle('wishlisted', wishlisted);
    btn.classList.toggle('active', wishlisted);
    btn.title = wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist';
  });
}

/* --------------------------------------------------------------------------
   8. CURRENCY FORMATTER
   -------------------------------------------------------------------------- */
function fmtINR(amount) {
  return new Intl.NumberFormat(CONFIG.CURRENCY_LOCALE, {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/* --------------------------------------------------------------------------
   9. DRAWER SYSTEM (Cart, Wishlist, Mobile Nav)
   -------------------------------------------------------------------------- */
function openDrawer(drawerId) {
  const drawer = document.getElementById(drawerId);
  const overlay = document.getElementById('drawerOverlay');
  if (!drawer) return;
  drawer.classList.add('open');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDrawer(drawerId) {
  const drawer = document.getElementById(drawerId);
  const overlay = document.getElementById('drawerOverlay');
  if (!drawer) return;
  drawer.classList.remove('open');
  // Only close overlay if no other drawers are open
  const anyOpen = document.querySelectorAll('.drawer.open').length > 0;
  if (!anyOpen && overlay) overlay.classList.remove('open');
  if (!anyOpen) document.body.style.overflow = '';
}

function closeAllDrawers() {
  document.querySelectorAll('.drawer.open').forEach(d => d.classList.remove('open'));
  const overlay = document.getElementById('drawerOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function openMobileNav() {
  const nav = document.getElementById('mobileNav');
  const ham = document.getElementById('hamburgerBtn');
  if (nav) nav.classList.add('open');
  if (ham) ham.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMobileNav() {
  const nav = document.getElementById('mobileNav');
  const ham = document.getElementById('hamburgerBtn');
  if (nav) nav.classList.remove('open');
  if (ham) ham.classList.remove('open');
  document.body.style.overflow = '';
}

/* --------------------------------------------------------------------------
   10. CART DRAWER RENDER
   -------------------------------------------------------------------------- */
function renderCartDrawer() {
  const body = document.getElementById('cartBody');
  const footer = document.getElementById('cartFooter');
  if (!body) return;

  const items = Cart.getItems();

  if (items.length === 0) {
    body.innerHTML = `
      <div class="drawer-empty">
        <div class="empty-icon">🛍️</div>
        <h3 class="empty-title">Your vault is empty</h3>
        <p class="empty-desc">Discover our handcrafted jewellery collection</p>
        <a href="products.html" class="btn btn-outline btn-sm" onclick="closeAllDrawers()">Explore Jewellery</a>
      </div>`;
    if (footer) footer.style.display = 'none';
    return;
  }

  if (footer) footer.style.display = 'block';

  body.innerHTML = items.map(item => `
    <div class="cart-item" id="cartItem_${item._key.replace(/[^a-zA-Z0-9]/g, '_')}">
      <img class="cart-item-img" src="${item.image}" alt="${item.name}" loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%2318161B%22/><text y=%2255%22 x=%2250%22 text-anchor=%22middle%22 font-size=%2240%22>💎</text></svg>'">
      <div>
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-meta">${item.metal}${item.selectedSize ? ' · Size ' + item.selectedSize : ''}</div>
        <div class="qty-control" style="margin-top:var(--sp-2);">
          <button class="qty-btn" onclick="cartQty('${item._key}', -1)" aria-label="Decrease">−</button>
          <span class="qty-value">${item.quantity}</span>
          <button class="qty-btn" onclick="cartQty('${item._key}', 1)" aria-label="Increase">+</button>
        </div>
      </div>
      <div class="cart-item-price">
        ${fmtINR(item.price * item.quantity)}
        <button class="btn-remove-item" onclick="cartRemove('${item._key}')">Remove</button>
      </div>
    </div>
  `).join('');

  if (footer) {
    const coupon = State.appliedCoupon;
    footer.innerHTML = `
      <div class="coupon-row">
        <input type="text" id="couponInput" class="coupon-input" placeholder="COUPON CODE"
               value="${coupon ? coupon.code : ''}" ${coupon ? 'disabled' : ''}>
        ${coupon
          ? `<button class="btn btn-ghost btn-sm" onclick="cartRemoveCoupon()">Remove</button>`
          : `<button class="btn btn-outline btn-sm" onclick="cartApplyCoupon()">Apply</button>`}
      </div>
      <div class="cart-totals">
        <div class="total-row"><span>Subtotal</span><span>${fmtINR(Cart.getSubtotal())}</span></div>
        ${coupon ? `<div class="total-row" style="color:var(--clr-success)"><span>Discount (${coupon.code})</span><span>−${fmtINR(Cart.getDiscount())}</span></div>` : ''}
        <div class="total-row"><span>GST (3%)</span><span>${fmtINR(Cart.getGST())}</span></div>
        <div class="total-row"><span>Insured Delivery</span><span>${Cart.getShipping() === 0 ? '<span style="color:var(--clr-success)">FREE</span>' : fmtINR(Cart.getShipping())}</span></div>
        <div class="total-row grand"><span>Total</span><span>${fmtINR(Cart.getTotal())}</span></div>
      </div>
      <a href="checkout.html" class="btn btn-primary" style="width:100%;justify-content:center;" onclick="closeAllDrawers()">
        ✦ Proceed to Checkout
      </a>
      <div style="text-align:center;margin-top:var(--sp-3);">
        <button class="btn btn-ghost btn-sm" onclick="closeDrawer('cartDrawer')">Continue Shopping</button>
      </div>
    `;
  }
}

function cartQty(key, delta) {
  Cart.updateQty(key, delta);
  renderCartDrawer();
}

function cartRemove(key) {
  Cart.removeItem(key);
  renderCartDrawer();
}

async function cartApplyCoupon() {
  const code = document.getElementById('couponInput')?.value;
  await Cart.applyCoupon(code);
  renderCartDrawer();
}

function cartRemoveCoupon() {
  Cart.removeCoupon();
  renderCartDrawer();
}

/* --------------------------------------------------------------------------
   11. WISHLIST DRAWER RENDER
   -------------------------------------------------------------------------- */
function renderWishlistDrawer() {
  const body = document.getElementById('wishlistBody');
  if (!body) return;

  const items = Wishlist.getItems();

  if (items.length === 0) {
    body.innerHTML = `
      <div class="drawer-empty">
        <div class="empty-icon">❤️</div>
        <h3 class="empty-title">No saved jewels</h3>
        <p class="empty-desc">Tap the ❤️ on any product to save it here</p>
        <a href="products.html" class="btn btn-outline btn-sm" onclick="closeAllDrawers()">Browse Collection</a>
      </div>`;
    return;
  }

  body.innerHTML = items.map(item => `
    <div class="cart-item">
      <img class="cart-item-img" src="${item.image}" alt="${item.name}" loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%2318161B%22/><text y=%2255%22 x=%2250%22 text-anchor=%22middle%22 font-size=%2240%22>💎</text></svg>'">
      <div>
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-meta">${item.metal}</div>
        <div class="cart-item-price" style="display:block;margin-top:var(--sp-2);">${fmtINR(item.price)}</div>
        <button class="btn btn-outline btn-sm" style="margin-top:var(--sp-2);"
                onclick="wishlistMoveToCart('${item.id}')">Move to Cart</button>
      </div>
      <div>
        <button class="btn-remove-item" onclick="wishlistRemove('${item.id}')">Remove</button>
      </div>
    </div>
  `).join('');
}

function wishlistRemove(id) {
  const product = Wishlist.getItems().find(i => i.id === id);
  if (product) Wishlist.toggle(product);
  renderWishlistDrawer();
}

function wishlistMoveToCart(id) {
  Wishlist.moveToCart(id);
  renderWishlistDrawer();
  renderCartDrawer();
}

/* --------------------------------------------------------------------------
   11.5 WHATSAPP INQUIRY HELPER
   -------------------------------------------------------------------------- */
function getWhatsAppInquiryUrl(p) {
  const phone = CONFIG.WHATSAPP_PHONE || '919876543210';
  const sku = p.sku || p.id || '';
  const metal = [p.metal, p.purity].filter(Boolean).join(' · ');
  const message = `Hello Shree Sai Jewellers,\n\nI would like to know the current live price and details for:\n✨ *${p.name}*\n🏷️ SKU: ${sku}\n${metal ? '🥇 Metal: ' + metal + '\n' : ''}\nPlease share the live gold/diamond rate and availability. Thank you!`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function openWhatsAppInquiry(p) {
  window.open(getWhatsAppInquiryUrl(p), '_blank');
}

/* --------------------------------------------------------------------------
   12. PRODUCT CARD BUILDER
   -------------------------------------------------------------------------- */
function buildProductCard(p) {
  const isOOS = p.stock < 1;
  const badgeMap = {
    new:        `<span class="badge badge-new">New</span>`,
    bestseller: `<span class="badge badge-bestseller">Bestseller</span>`,
    sale:       `<span class="badge badge-sale">Special</span>`,
    trending:   `<span class="badge badge-trending">Trending</span>`,
    bridal:     `<span class="badge badge-bridal">Bridal</span>`,
    limited:    `<span class="badge badge-limited">Limited</span>`,
  };

  const badge = p.badge ? badgeMap[p.badge.toLowerCase()] || `<span class="badge badge-trending">${p.badge}</span>` : '';
  const oosBadge = isOOS ? `<span class="badge badge-out-of-stock">Out of Stock</span>` : '';
  const wishlisted = Wishlist.isWishlisted(p.id);
  const waUrl = getWhatsAppInquiryUrl(p);

  return `
    <div class="product-card ${isOOS ? 'out-of-stock' : ''}" data-product-id="${p.id}">
      <div class="product-img-wrap">
        <img class="product-img" src="${p.images?.[0] || p.image || ''}" alt="${p.name}" loading="lazy"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%2318161B%22/><text y=%2255%22 x=%2250%22 text-anchor=%22middle%22 font-size=%2240%22>💎</text></svg>'">
        ${p.images?.[1] ? `<img class="product-img-hover" src="${p.images[1]}" alt="${p.name} alternate view" loading="lazy">` : ''}
        <div class="product-badges">
          ${badge}${oosBadge}
        </div>
        <div class="product-card-actions">
          <button class="card-action-btn ${wishlisted ? 'wishlisted' : ''}"
                  data-wishlist-id="${p.id}"
                  onclick="event.stopPropagation(); toggleWishlist(${JSON.stringify(JSON.stringify(p)).slice(1,-1)})"
                  title="${wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}">
            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
          <a class="card-action-btn" href="product-detail.html?id=${p.id}" title="View Details">
            <svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </a>
        </div>
      </div>
      <div class="product-card-body" onclick="window.location='product-detail.html?id=${p.id}'" style="cursor:pointer;">
        <div class="product-meta">${p.metal || ''} ${p.purity ? '· ' + p.purity : ''}</div>
        <h3 class="product-name">${p.name}</h3>
        <div class="product-price-row" style="margin-top:var(--sp-2);">
          <span style="font-size:var(--fs-xs);font-weight:600;color:var(--clr-gold);letter-spacing:0.04em;text-transform:uppercase;">✦ Rate on Request</span>
        </div>
      </div>
      <div class="product-card-footer">
        <a href="${waUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation();" class="btn-wa-inquire" title="View Rate on WhatsApp">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="flex-shrink:0;"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 18.12c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.11 8.11 0 0 1-1.25-4.46c0-4.47 3.64-8.11 8.11-8.11 2.17 0 4.21.85 5.74 2.38a8.07 8.07 0 0 1 2.38 5.74c0 4.48-3.64 8.11-8.19 8.11zm4.44-6.08c-.24-.12-1.44-.71-1.66-.79-.22-.09-.39-.12-.55.12-.17.24-.64.79-.79.95-.14.16-.29.18-.54.06-.24-.12-1.03-.38-1.96-1.21-.73-.65-1.22-1.45-1.36-1.69-.14-.24-.02-.37.1-.49.11-.11.24-.29.37-.43.12-.14.16-.24.24-.4.08-.17.04-.31-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.41-.41-.56-.42h-.48c-.16 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28z"/></svg>
          <span class="btn-wa-text-desktop">View Rate on WhatsApp</span>
          <span class="btn-wa-text-mobile">Rate on WhatsApp</span>
        </a>
      </div>
    </div>
  `;
}

/* --------------------------------------------------------------------------
   13. WISHLIST TOGGLE (called from product cards)
   -------------------------------------------------------------------------- */
function toggleWishlist(productJson) {
  try {
    const product = JSON.parse(productJson);
    Wishlist.toggle(product);
    renderWishlistDrawer();
  } catch (e) {
    console.error('toggleWishlist error:', e);
  }
}

// Quick add to cart — fetches product then adds (respects stock)
async function quickAddToCart(productId) {
  try {
    const data = await ApiService.getProduct(productId);
    const product = data.product || data;
    Cart.addItem(product);
    renderCartDrawer();
  } catch (err) {
    Toast.show('Could not add to cart. Please try again.', 'error');
  }
}

/* --------------------------------------------------------------------------
   14. LIVE SEARCH (debounced)
   -------------------------------------------------------------------------- */
let _searchTimeout = null;

function handleHeaderSearch(e) {
  const query = e.target.value.trim();
  clearTimeout(_searchTimeout);

  const suggestBox = document.getElementById('searchSuggestions');

  if (query.length < 2) {
    if (suggestBox) { suggestBox.innerHTML = ''; suggestBox.classList.remove('visible'); }
    return;
  }

  _searchTimeout = setTimeout(async () => {
    if (suggestBox) { suggestBox.innerHTML = '<div style="padding:var(--sp-4);color:var(--clr-text-muted);font-size:var(--fs-sm);">Searching…</div>'; suggestBox.classList.add('visible'); }
    try {
      const data = await ApiService.searchProducts(query, { limit: 5 });
      const products = data.products || data;
      if (!suggestBox) return;
      if (!products.length) {
        suggestBox.innerHTML = '<div style="padding:var(--sp-4);color:var(--clr-text-muted);font-size:var(--fs-sm);">No results found</div>';
        return;
      }
      suggestBox.innerHTML = products.map(p => `
        <a href="product-detail.html?id=${p.id}" class="suggestion-item" onclick="closeSuggestions()">
          <img class="suggestion-img" src="${p.images?.[0] || p.image || ''}" alt="${p.name}" loading="lazy"
               onerror="this.style.display='none'">
          <div class="suggestion-text">
            <div class="suggestion-name">${p.name}</div>
            <div class="suggestion-price" style="color:var(--clr-gold);font-size:11px;">✦ Rate on Request</div>
          </div>
        </a>
      `).join('') + `<a href="search.html?q=${encodeURIComponent(query)}" class="suggestion-item" style="justify-content:center;color:var(--clr-gold);font-size:var(--fs-sm);">
        View all results for "${query}" →
      </a>`;
    } catch {
      if (suggestBox) suggestBox.innerHTML = '<div style="padding:var(--sp-4);color:var(--clr-text-muted);font-size:var(--fs-sm);">Search unavailable</div>';
    }
  }, CONFIG.SEARCH_DEBOUNCE);
}

function closeSuggestions() {
  const suggestBox = document.getElementById('searchSuggestions');
  if (suggestBox) { suggestBox.innerHTML = ''; suggestBox.classList.remove('visible'); }
}

function handleSearchKeydown(e) {
  if (e.key === 'Enter') {
    const query = e.target.value.trim();
    if (query) window.location.href = `search.html?q=${encodeURIComponent(query)}`;
  }
  if (e.key === 'Escape') closeSuggestions();
}

/* --------------------------------------------------------------------------
   15. LIVE RATES (top bar)
   -------------------------------------------------------------------------- */
async function loadLiveRates() {
  const r = CONFIG.DEFAULT_RATES;
  try {
    const data = await ApiService.getRates();
    const rates = data.rates || data;
    updateRatesUI(rates);
  } catch {
    updateRatesUI({ gold_24k: r.gold24k, gold_22k: r.gold22k, silver_999: r.silver999 });
  }
}

function updateRatesUI(rates) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('rate24k', `₹${(rates.gold_24k || rates.gold24k || CONFIG.DEFAULT_RATES.gold24k).toLocaleString('en-IN')}/g`);
  set('rate22k', `₹${(rates.gold_22k || rates.gold22k || CONFIG.DEFAULT_RATES.gold22k).toLocaleString('en-IN')}/g`);
  set('rateSilver', `₹${(rates.silver_999 || rates.silver999 || CONFIG.DEFAULT_RATES.silver999)}/g`);
}

/* --------------------------------------------------------------------------
   16. HOMEPAGE LOADERS
   -------------------------------------------------------------------------- */

// Load banners → hero section
async function loadHero() {
  try {
    const data = await ApiService.getBanners();
    const banners = data.banners || data;
    const hero = banners.find(b => b.type === 'hero' || b.position === 'hero') || banners[0];
    if (!hero) return;

    const el = id => document.getElementById(id);
    if (el('heroBgImage') && hero.image) el('heroBgImage').src = hero.image;
    if (el('heroEyebrow') && hero.eyebrow) el('heroEyebrow').textContent = hero.eyebrow;
    if (el('heroTitle') && hero.title) {
      el('heroTitle').innerHTML = hero.title.replace(/\n/, '<br>');
    }
    if (el('heroTitleGold') && hero.title_gold) el('heroTitleGold').textContent = hero.title_gold;
    if (el('heroDesc') && hero.description) el('heroDesc').textContent = hero.description;
    if (el('heroCTAPrimary') && hero.cta_primary_text) {
      el('heroCTAPrimary').textContent = hero.cta_primary_text;
      if (hero.cta_primary_url) el('heroCTAPrimary').href = hero.cta_primary_url;
    }
    if (el('heroCTASecondary') && hero.cta_secondary_text) {
      el('heroCTASecondary').textContent = hero.cta_secondary_text;
      if (hero.cta_secondary_url) el('heroCTASecondary').href = hero.cta_secondary_url;
    }
  } catch (err) {
    console.warn('Hero banner load failed — using defaults:', err.message);
  }
}

// Load categories grid
async function loadCategories(containerId = 'categoriesGrid') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = Skeleton.categoryCard(6);
  try {
    const data = await ApiService.getCategories();
    const allCats = data.categories || data || [];
    const cats = allCats.filter(cat => {
      const name = (cat.name || '').toLowerCase();
      const slug = (cat.slug || '').toLowerCase();
      return !name.includes('bridal') && !slug.includes('bridal');
    });
    if (!cats.length) { container.innerHTML = '<p style="color:var(--clr-text-muted);padding:var(--sp-8);">No categories available.</p>'; return; }
    container.innerHTML = cats.map(cat => `
      <a href="products.html?category=${encodeURIComponent(cat.name)}" class="category-card fade-in">
        <img class="category-img" src="${cat.image || cat.img || ''}" alt="${cat.name}" loading="lazy"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 150%22><rect width=%22100%22 height=%22150%22 fill=%22%2218161B%22/><text y=%2280%22 x=%2250%22 text-anchor=%22middle%22 font-size=%2248%22>${cat.icon || '💎'}</text></svg>'">
        <div class="category-overlay"></div>
        <div class="category-content">
          ${cat.icon ? `<span class="category-icon">${cat.icon}</span>` : ''}
          <div class="category-name">${cat.name}</div>
          <div class="category-count">${cat.product_count ? cat.product_count + ' Designs' : cat.count || ''}</div>
        </div>
      </a>
    `).join('');
    observeFadeIns(container);
  } catch (err) {
    container.innerHTML = buildStateBox('⚠️', 'Could not load categories', err.message);
  }
}

// Generic product section loader
async function loadProductSection(containerId, apiParams, skeletonCount = 4) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = Skeleton.productCard(skeletonCount);
  try {
    const data = await ApiService.getProducts(apiParams);
    const products = data.products || data;
    if (!products.length) { container.innerHTML = buildStateBox('🔍', 'No products found', 'Check back soon!'); return; }
    container.innerHTML = products.map(buildProductCard).join('');
    observeFadeIns(container);
  } catch (err) {
    container.innerHTML = buildStateBox('⚠️', 'Could not load products', err.message);
  }
}

// Load offers
async function loadOffers(containerId = 'offersGrid') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = Skeleton.productCard(3);
  try {
    const data = await ApiService.getOffers();
    const offers = data.offers || data;
    if (!offers.length) { container.innerHTML = '<p style="color:var(--clr-text-muted);text-align:center;padding:var(--sp-8);">No active offers at the moment.</p>'; return; }
    container.innerHTML = offers.map(offer => `
      <div class="offer-card fade-in">
        <div class="offer-tag">${offer.tag || 'Special Offer'}</div>
        <div class="offer-title">${offer.title}</div>
        ${offer.discount_percent ? `<div class="offer-discount">${offer.discount_percent}% OFF</div>` : ''}
        ${offer.flat_discount ? `<div class="offer-discount">${fmtINR(offer.flat_discount)} OFF</div>` : ''}
        <p style="font-size:var(--fs-sm);color:var(--clr-text-secondary);">${offer.description || ''}</p>
        ${offer.coupon_code ? `
          <div class="offer-code-wrap">
            <span class="offer-code">${offer.coupon_code}</span>
            <button class="btn btn-sm btn-outline" onclick="copyCode('${offer.coupon_code}')">Copy</button>
          </div>` : ''}
        <div class="offer-expiry">${offer.valid_till ? 'Valid till: ' + new Date(offer.valid_till).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }) : ''}</div>
        ${offer.category ? `<a href="products.html?category=${encodeURIComponent(offer.category)}" class="btn btn-primary btn-sm">Shop Now</a>` : ''}
      </div>
    `).join('');
    observeFadeIns(container);
  } catch (err) {
    container.innerHTML = buildStateBox('⚠️', 'Could not load offers', err.message);
  }
}

// Load customer reviews
async function loadReviews(containerId = 'reviewsGrid') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = Skeleton.reviewCard(3);
  try {
    const data = await ApiService.getReviews({ approved: true, limit: 6 });
    const reviews = data.reviews || data;
    if (!reviews.length) { container.innerHTML = '<p style="color:var(--clr-text-muted);text-align:center;padding:var(--sp-8);">No reviews yet.</p>'; return; }
    container.innerHTML = reviews.map(r => buildReviewCard(r)).join('');
    observeFadeIns(container);
  } catch (err) {
    container.innerHTML = buildStateBox('⚠️', 'Could not load reviews', err.message);
  }
}

function buildReviewCard(r) {
  const stars = Array.from({ length: 5 }, (_, i) =>
    `<span class="star ${i < (r.rating || 5) ? '' : 'empty'}">★</span>`).join('');
  const initials = (r.reviewer_name || r.name || 'A').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const date = r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '';

  return `
    <div class="review-card fade-in">
      <div class="review-stars">${stars}</div>
      <p class="review-text">"${r.text || r.review || r.content || ''}"</p>
      <div class="review-author">
        <div class="review-avatar">${initials}</div>
        <div>
          <div class="review-name">${r.reviewer_name || r.name || 'Customer'}</div>
          <div class="review-date">${date}</div>
          ${r.verified_purchase ? `<div class="review-verified">✅ Verified Purchase</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

// Load store info
async function loadStoreInfo() {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.textContent = val; };
  const setLink = (id, url) => { const el = document.getElementById(id); if (el && url) el.href = url; };
  try {
    const data = await ApiService.getStoreInfo();
    const store = data.store || data;
    set('storeAddress', store.address || CONFIG.SITE_ADDRESS);
    set('storePhone', store.phone || CONFIG.SITE_PHONE);
    set('storeEmail', store.email || CONFIG.SITE_EMAIL);
    set('storeHours', store.hours || store.store_hours || CONFIG.STORE_HOURS);
    setLink('storeMapsLink', store.maps_url || CONFIG.SITE_MAPS_URL);
  } catch {
    // Fallback to CONFIG defaults
    set('storeAddress', CONFIG.SITE_ADDRESS);
    set('storePhone', CONFIG.SITE_PHONE);
    set('storeEmail', CONFIG.SITE_EMAIL);
    set('storeHours', CONFIG.STORE_HOURS);
    setLink('storeMapsLink', CONFIG.SITE_MAPS_URL);
  }
}

/* --------------------------------------------------------------------------
   17. NEWSLETTER FORM
   -------------------------------------------------------------------------- */
async function handleNewsletterSubmit(e) {
  e.preventDefault();
  const input = e.target.querySelector('input[type="email"]');
  const btn = e.target.querySelector('button[type="submit"]');
  if (!input || !input.value) return;

  btn.disabled = true;
  btn.textContent = 'Subscribing…';
  try {
    await ApiService.subscribeNewsletter(input.value);
    Toast.show('Thank you for subscribing! 🎉', 'success');
    input.value = '';
    e.target.innerHTML = '<p style="color:var(--clr-success);font-weight:600;">✅ You\'re subscribed to our exclusive offers!</p>';
  } catch (err) {
    Toast.show(err.message || 'Subscription failed. Please try again.', 'error');
    btn.disabled = false;
    btn.textContent = 'Subscribe';
  }
}

/* --------------------------------------------------------------------------
   18. PRODUCT LISTING PAGE (products.html)
   -------------------------------------------------------------------------- */
const ProductListing = {
  currentPage: 1,
  totalPages: 1,
  filters: {
    category: '',
    metal: [],
    purity: [],
    jewellery_type: [],
    max_price: '',
    min_price: '',
    in_stock: false,
    sort: 'featured',
    q: '',
  },

  async init() {
    this.readURLParams();
    await this.loadFilterOptions();
    await this.loadProducts();
    this.bindFilterEvents();
    this.syncFilterUI();
  },

  readURLParams() {
    const params = new URLSearchParams(window.location.search);
    this.filters.category     = params.get('category') || '';
    this.filters.q            = params.get('q') || '';
    this.filters.sort         = params.get('sort') || 'featured';
    this.currentPage          = parseInt(params.get('page') || '1', 10);

    // Update page title if category
    if (this.filters.category) {
      document.title = `${this.filters.category} — ${CONFIG.SITE_NAME}`;
      const heroTitle = document.getElementById('pageHeroTitle');
      if (heroTitle) heroTitle.textContent = this.filters.category;
      this.activateSubNav(this.filters.category);
    }
    if (this.filters.q) {
      const heroTitle = document.getElementById('pageHeroTitle');
      if (heroTitle) heroTitle.textContent = `Search: "${this.filters.q}"`;
    }
  },

  activateSubNav(category) {
    document.querySelectorAll('.sub-nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.category === category || (category === '' && link.dataset.category === 'all'));
    });
  },

  async loadFilterOptions() {
    try {
      const data = await ApiService.getCategories();
      const cats = data.categories || data;
      // Could populate category dropdown filter here if needed
    } catch { /* ignore */ }
  },

  async loadProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    grid.innerHTML = Skeleton.productCard(CONFIG.PRODUCTS_PER_PAGE);

    const params = {
      page: this.currentPage,
      limit: CONFIG.PRODUCTS_PER_PAGE,
      sort: this.filters.sort,
    };
    if (this.filters.category)    params.category = this.filters.category;
    if (this.filters.q)           params.q = this.filters.q;
    if (this.filters.min_price)   params.min_price = this.filters.min_price;
    if (this.filters.max_price)   params.max_price = this.filters.max_price;
    if (this.filters.in_stock)    params.in_stock = true;
    if (this.filters.metal.length)  params.metal = this.filters.metal.join(',');
    if (this.filters.purity.length) params.purity = this.filters.purity.join(',');
    if (this.filters.jewellery_type.length) params.jewellery_type = this.filters.jewellery_type.join(',');

    try {
      const data = await ApiService.getProducts(params);
      const products = data.products || data;
      const total = data.total || products.length;
      const count = document.getElementById('resultCount');
      if (count) count.textContent = `${total} product${total !== 1 ? 's' : ''} found`;

      this.totalPages = Math.ceil(total / CONFIG.PRODUCTS_PER_PAGE);

      if (!products.length) {
        grid.innerHTML = buildStateBox('🔍', 'No products found', 'Try adjusting your filters');
        this.renderPagination();
        return;
      }
      grid.innerHTML = products.map(buildProductCard).join('');
      observeFadeIns(grid);
      this.renderPagination();
      this.renderActiveFilters();
    } catch (err) {
      grid.innerHTML = buildStateBox('⚠️', 'Could not load products', err.message + '<br><button class="btn btn-outline btn-sm" style="margin-top:var(--sp-4);" onclick="ProductListing.loadProducts()">Retry</button>');
    }
  },

  renderPagination() {
    const container = document.getElementById('pagination');
    if (!container || this.totalPages <= 1) { if (container) container.innerHTML = ''; return; }
    let pages = '';
    const cur = this.currentPage;
    const total = this.totalPages;
    const makeBtn = (page, label, disabled = false, active = false) =>
      `<button class="page-btn ${active ? 'active' : ''}" ${disabled ? 'disabled' : ''} onclick="ProductListing.goToPage(${page})">${label}</button>`;

    pages += makeBtn(cur - 1, '‹', cur === 1);
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= cur - 2 && i <= cur + 2)) {
        pages += makeBtn(i, i, false, i === cur);
      } else if (i === cur - 3 || i === cur + 3) {
        pages += `<span class="page-btn" style="pointer-events:none">…</span>`;
      }
    }
    pages += makeBtn(cur + 1, '›', cur === total);
    container.innerHTML = pages;
  },

  goToPage(page) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  bindFilterEvents() {
    // Sort select
    const sortSel = document.getElementById('sortSelect');
    if (sortSel) sortSel.addEventListener('change', () => { this.filters.sort = sortSel.value; this.currentPage = 1; this.loadProducts(); });

    // Category sub-nav
    document.querySelectorAll('.sub-nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.filters.category = link.dataset.category === 'all' ? '' : link.dataset.category;
        this.currentPage = 1;
        this.activateSubNav(this.filters.category);
        this.loadProducts();
      });
    });

    // Checkboxes
    document.querySelectorAll('.filter-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const group = cb.dataset.filterGroup;
        const val = cb.value;
        if (!this.filters[group]) this.filters[group] = [];
        if (cb.checked) { this.filters[group].push(val); }
        else { this.filters[group] = this.filters[group].filter(v => v !== val); }
        this.currentPage = 1;
        this.loadProducts();
      });
    });

    // In Stock toggle
    const stockCb = document.getElementById('inStockOnly');
    if (stockCb) stockCb.addEventListener('change', () => { this.filters.in_stock = stockCb.checked; this.currentPage = 1; this.loadProducts(); });
  },

  syncFilterUI() {
    // Sync sort dropdown
    const sortSel = document.getElementById('sortSelect');
    if (sortSel) sortSel.value = this.filters.sort;
    // Sync sub-nav
    this.activateSubNav(this.filters.category);
  },

  renderActiveFilters() {
    const container = document.getElementById('activeFilters');
    if (!container) return;
    const chips = [];
    if (this.filters.category) chips.push({ label: this.filters.category, remove: () => { this.filters.category = ''; this.loadProducts(); } });
    if (this.filters.q) chips.push({ label: `Search: "${this.filters.q}"`, remove: () => { this.filters.q = ''; this.loadProducts(); } });
    [...(this.filters.metal || [])].forEach(m => chips.push({ label: m, remove: () => { this.filters.metal = this.filters.metal.filter(v => v !== m); this.loadProducts(); } }));
    if (this.filters.in_stock) chips.push({ label: 'In Stock Only', remove: () => { this.filters.in_stock = false; this.loadProducts(); } });

    if (!chips.length) { container.innerHTML = ''; return; }
    container.innerHTML = chips.map((chip, i) => `
      <div class="filter-chip">${chip.label} <span class="chip-remove" onclick="ProductListing._removeChip(${i})">✕</span></div>
    `).join('');
    this._chips = chips;
  },

  _chips: [],
  _removeChip(i) { this._chips[i]?.remove(); },

  resetFilters() {
    this.filters = { category: '', metal: [], purity: [], jewellery_type: [], max_price: '', min_price: '', in_stock: false, sort: 'featured', q: '' };
    this.currentPage = 1;
    document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = false);
    const stockCb = document.getElementById('inStockOnly');
    if (stockCb) stockCb.checked = false;
    const priceMin = document.getElementById('priceMin');
    const priceMax = document.getElementById('priceMax');
    if (priceMin) priceMin.value = '';
    if (priceMax) priceMax.value = '';
    this.loadProducts();
  },
};

/* --------------------------------------------------------------------------
   19. PRODUCT DETAIL PAGE
   -------------------------------------------------------------------------- */
const ProductDetail = {
  product: null,
  selectedSize: null,
  currentImage: 0,

  async init() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) { window.location.href = 'products.html'; return; }

    const container = document.getElementById('productDetailContainer');
    if (container) container.innerHTML = `<div class="loading-overlay"><div class="spinner"></div></div>`;

    try {
      const data = await ApiService.getProduct(id);
      this.product = data.product || data;
      this.render();
      this.loadRelated();
    } catch (err) {
      if (container) container.innerHTML = buildStateBox('⚠️', 'Product not found', err.message + '<br><a href="products.html" class="btn btn-outline btn-sm" style="margin-top:var(--sp-4);">Back to Products</a>');
    }
  },

  render() {
    const p = this.product;
    document.title = `${p.name} — ${CONFIG.SITE_NAME}`;
    // Update meta description
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = p.description || `${p.name} - ${p.metal || ''} ${p.purity || ''}`;
    // Structured data
    this.injectStructuredData(p);

    const container = document.getElementById('productDetailContainer');
    if (!container) return;

    const isOOS = p.stock < 1;
    const originalPrice = p.original_price || p.originalPrice;
    const discountPct = p.discount_percent || p.discountPercent || 0;
    const images = p.images || (p.image ? [p.image] : []);

    container.innerHTML = `
      <nav class="breadcrumb">
        <a href="index.html">Home</a><span class="breadcrumb-sep">›</span>
        <a href="products.html">Jewellery</a><span class="breadcrumb-sep">›</span>
        ${p.category ? `<a href="products.html?category=${encodeURIComponent(p.category)}">${p.category}</a><span class="breadcrumb-sep">›</span>` : ''}
        <span class="breadcrumb-current">${p.name}</span>
      </nav>

      <div class="product-detail-grid">
        <!-- Gallery -->
        <div>
          <div class="gallery-main" id="galleryMain">
            <img id="galleryMainImg" src="${images[0] || ''}" alt="${p.name}"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 400%22><rect width=%22400%22 height=%22400%22 fill=%22%2318161B%22/><text y=%22210%22 x=%22200%22 text-anchor=%22middle%22 font-size=%22100%22>💎</text></svg>'">
          </div>
          <div class="gallery-thumbs" id="galleryThumbs">
            ${images.map((img, i) => `
              <div class="gallery-thumb ${i === 0 ? 'active' : ''}" onclick="ProductDetail.setImage(${i})">
                <img src="${img}" alt="${p.name} view ${i + 1}" loading="lazy">
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Info -->
        <div>
          <div class="product-sku">SKU: ${p.sku || p.id}</div>
          <h1 class="product-detail-name">${p.name}</h1>

          <div class="product-detail-price" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--sp-4);">
            <div>
              <div style="font-size:var(--fs-xs);letter-spacing:var(--ls-wider);text-transform:uppercase;color:var(--clr-gold);margin-bottom:var(--sp-1);">Live Bullion Rate</div>
              <span class="detail-price-current" style="font-size:var(--fs-2xl);">Rate on Request</span>
            </div>
            <a href="${getWhatsAppInquiryUrl(p)}" target="_blank" rel="noopener" class="btn btn-primary btn-wa-detail" style="background:#25D366;border-color:#25D366;color:#fff;box-shadow:0 4px 18px rgba(37,211,102,0.35);display:inline-flex;align-items:center;gap:8px;font-weight:700;">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="flex-shrink:0;"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 18.12c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.11 8.11 0 0 1-1.25-4.46c0-4.47 3.64-8.11 8.11-8.11 2.17 0 4.21.85 5.74 2.38a8.07 8.07 0 0 1 2.38 5.74c0 4.48-3.64 8.11-8.19 8.11zm4.44-6.08c-.24-.12-1.44-.71-1.66-.79-.22-.09-.39-.12-.55.12-.17.24-.64.79-.79.95-.14.16-.29.18-.54.06-.24-.12-1.03-.38-1.96-1.21-.73-.65-1.22-1.45-1.36-1.69-.14-.24-.02-.37.1-.49.11-.11.24-.29.37-.43.12-.14.16-.24.24-.4.08-.17.04-.31-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.41-.41-.56-.42h-.48c-.16 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28z"/></svg>
              <span>View Rate on WhatsApp</span>
            </a>
          </div>

          <!-- Stock -->
          <div style="margin-bottom:var(--sp-4);">
            ${isOOS
              ? `<span class="badge badge-out-of-stock" style="font-size:var(--fs-sm);padding:4px 12px;">⚠️ Out of Stock</span>`
              : `<span style="color:var(--clr-success);font-size:var(--fs-sm);">✅ Available for Order</span>`
            }
          </div>

          <!-- Price & Transparency Info -->
          <div class="price-breakdown">
            <div class="price-breakdown-title">⚖️ Product Details & Purity Guarantee</div>
            ${p.gross_weight ? `<div class="breakdown-row"><span>Gross Weight</span><strong>${p.gross_weight}</strong></div>` : ''}
            ${p.net_weight ? `<div class="breakdown-row"><span>Net Weight</span><strong>${p.net_weight}</strong></div>` : ''}
            ${p.purity ? `<div class="breakdown-row"><span>Gold/Silver Purity</span><strong>${p.purity}</strong></div>` : ''}
            ${p.certificate ? `<div class="breakdown-row"><span>Certification</span><strong style="color:var(--clr-gold)">${p.certificate}</strong></div>` : ''}
            <div class="breakdown-row" style="padding-top:var(--sp-3);border-top:1px dashed var(--clr-border);">
              <span>Pricing Policy</span>
              <span style="font-size:var(--fs-xs);color:var(--clr-gold);">Calculated live as per daily bullion market rate</span>
            </div>
          </div>

          <!-- Specs -->
          <div class="specs-grid">
            ${[
              ['Metal', p.metal],
              ['Purity', p.purity],
              ['Diamond Carat', p.diamond_carat || p.diamondCarat],
              ['Diamond Clarity', p.diamond_clarity || p.diamondClarity],
              ['Diamond Colour', p.diamond_color || p.diamondColor],
              ['Certificate', p.certificate],
            ].filter(([, v]) => v && v !== 'N/A').map(([label, val]) => `
              <div class="spec-item">
                <div class="spec-label">${label}</div>
                <div class="spec-value">${val}</div>
              </div>
            `).join('')}
          </div>

          <!-- Size Selector -->
          ${p.sizes?.length ? `
            <div class="size-selector">
              <div class="size-label">Select Size <span id="selectedSizeDisplay" style="color:var(--clr-gold);"></span></div>
              <div class="size-options">
                ${p.sizes.map(size => `
                  <button class="size-option" onclick="ProductDetail.selectSize('${size}')" data-size="${size}">${size}</button>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Actions -->
          <div class="detail-actions" style="display:grid;grid-template-columns:auto 1fr;gap:var(--sp-3);margin-bottom:var(--sp-6);">
            <button class="btn-wishlist ${Wishlist.isWishlisted(p.id) ? 'active' : ''}"
                    data-wishlist-id="${p.id}"
                    onclick="ProductDetail.toggleWishlist()"
                    title="Add to Wishlist">
              <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
            <a href="${getWhatsAppInquiryUrl(p)}" target="_blank" rel="noopener" class="btn btn-primary btn-lg" style="background:linear-gradient(135deg, #25D366 0%, #128C7E 100%);border-color:transparent;color:#fff;font-size:var(--fs-base);justify-content:center;box-shadow:0 6px 25px rgba(37,211,102,0.35);">
              💬 View Live Rate & Inquire on WhatsApp ✦
            </a>
          </div>

          <!-- Certificate -->
          ${p.certificate ? `
            <div style="background:rgba(76,175,106,0.05);border:1px solid rgba(76,175,106,0.2);border-radius:var(--radius-md);padding:var(--sp-3) var(--sp-4);font-size:var(--fs-sm);color:var(--clr-success);margin-bottom:var(--sp-4);">
              🏆 ${p.certificate}
            </div>
          ` : ''}

          <!-- Tabs -->
          <div class="detail-tabs">
            <div class="tab-nav">
              <button class="tab-btn active" onclick="showTab('description')">Description</button>
              <button class="tab-btn" onclick="showTab('shipping')">Shipping & Returns</button>
              <button class="tab-btn" onclick="showTab('care')">Jewellery Care</button>
            </div>
            <div id="tab-description" class="tab-panel active tab-content">
              ${p.description || 'No description available.'}
            </div>
            <div id="tab-shipping" class="tab-panel tab-content">
              <p>✅ <strong>Free Insured Delivery</strong> on orders above ${fmtINR(CONFIG.FREE_SHIPPING_THRESHOLD)}</p>
              <p style="margin-top:var(--sp-3);">🔄 <strong>Easy Returns</strong> within 7 days of delivery</p>
              <p style="margin-top:var(--sp-3);">🚚 <strong>Estimated Delivery</strong>: 5-7 business days</p>
              <p style="margin-top:var(--sp-3);">📦 All jewellery ships in tamper-proof, insured vault packaging</p>
            </div>
            <div id="tab-care" class="tab-panel tab-content">
              <p>💧 <strong>Cleaning</strong>: Wipe with a soft, lint-free cloth</p>
              <p style="margin-top:var(--sp-3);">🚿 <strong>Avoid</strong>: Water, chemicals, perfumes and lotions</p>
              <p style="margin-top:var(--sp-3);">🗃️ <strong>Storage</strong>: Store in the provided velvet pouch or jewellery box</p>
              <p style="margin-top:var(--sp-3);">🔬 <strong>Service</strong>: Professional cleaning recommended every 6 months</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  setImage(index) {
    this.currentImage = index;
    const img = document.getElementById('galleryMainImg');
    const thumbs = document.querySelectorAll('.gallery-thumb');
    if (img && this.product?.images?.[index]) img.src = this.product.images[index];
    thumbs.forEach((t, i) => t.classList.toggle('active', i === index));
  },

  selectSize(size) {
    this.selectedSize = size;
    document.querySelectorAll('.size-option').forEach(opt => opt.classList.toggle('selected', opt.dataset.size === size));
    const display = document.getElementById('selectedSizeDisplay');
    if (display) display.textContent = `— ${size}`;
  },

  addToCart() {
    if (!this.product) return;
    if (this.product.sizes?.length && !this.selectedSize) {
      Toast.show('Please select a size first', 'warning');
      return;
    }
    Cart.addItem(this.product, 1, this.selectedSize);
    renderCartDrawer();
    openDrawer('cartDrawer');
  },

  buyNow() {
    if (!this.product) return;
    if (this.product.sizes?.length && !this.selectedSize) {
      Toast.show('Please select a size first', 'warning');
      return;
    }
    Cart.addItem(this.product, 1, this.selectedSize);
    window.location.href = 'checkout.html';
  },

  toggleWishlist() {
    if (!this.product) return;
    Wishlist.toggle(this.product);
    const btn = document.querySelector('.btn-wishlist');
    if (btn) {
      const isW = Wishlist.isWishlisted(this.product.id);
      btn.classList.toggle('active', isW);
    }
  },

  async loadRelated() {
    const container = document.getElementById('relatedProductsGrid');
    if (!container || !this.product) return;
    container.innerHTML = Skeleton.productCard(4);
    try {
      const data = await ApiService.getProducts({ category: this.product.category, limit: 4, exclude: this.product.id });
      const products = (data.products || data).filter(p => p.id !== this.product.id).slice(0, 4);
      if (!products.length) { container.parentElement.style.display = 'none'; return; }
      container.innerHTML = products.map(buildProductCard).join('');
    } catch {
      container.parentElement.style.display = 'none';
    }
  },

  injectStructuredData(p) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      description: p.description || '',
      sku: p.sku || p.id,
      brand: { '@type': 'Brand', name: CONFIG.SITE_NAME },
      offers: {
        '@type': 'Offer',
        price: p.price,
        priceCurrency: 'INR',
        availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
      image: p.images || [],
    });
    document.head.appendChild(script);
  },
};

/* --------------------------------------------------------------------------
   20. CHECKOUT PAGE
   -------------------------------------------------------------------------- */
const Checkout = {
  async init() {
    this.renderOrderSummary();
    this.loadSavedInfo();
    this.bindEvents();
    this.loadRazorpayScript();
  },

  renderOrderSummary() {
    const container = document.getElementById('checkoutOrderSummary');
    if (!container) return;
    const items = Cart.getItems();
    if (!items.length) { window.location.href = 'products.html'; return; }

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:var(--sp-3);margin-bottom:var(--sp-5);">
        ${items.map(item => `
          <div style="display:grid;grid-template-columns:60px 1fr auto;gap:var(--sp-3);align-items:center;">
            <img src="${item.image}" alt="${item.name}" style="width:60px;height:60px;border-radius:var(--radius-sm);object-fit:cover;background:var(--clr-surface-2);"
                 onerror="this.style.display='none'">
            <div>
              <div style="font-size:var(--fs-sm);font-weight:500;color:var(--clr-text-primary);line-height:1.3;">${item.name}</div>
              <div style="font-size:var(--fs-xs);color:var(--clr-text-muted);">Qty: ${item.quantity}${item.selectedSize ? ' · Size ' + item.selectedSize : ''}</div>
            </div>
            <div style="font-size:var(--fs-sm);font-weight:600;color:var(--clr-gold);white-space:nowrap;">${fmtINR(item.price * item.quantity)}</div>
          </div>
        `).join('')}
      </div>
      <div class="divider"></div>
      <div class="cart-totals" style="margin-top:var(--sp-4);">
        <div class="total-row"><span>Subtotal</span><span>${fmtINR(Cart.getSubtotal())}</span></div>
        ${State.appliedCoupon ? `<div class="total-row" style="color:var(--clr-success)"><span>Discount</span><span>−${fmtINR(Cart.getDiscount())}</span></div>` : ''}
        <div class="total-row"><span>GST (3%)</span><span>${fmtINR(Cart.getGST())}</span></div>
        <div class="total-row"><span>Shipping</span><span>${Cart.getShipping() === 0 ? '<span style="color:var(--clr-success)">FREE</span>' : fmtINR(Cart.getShipping())}</span></div>
        <div class="total-row grand"><span>Total Payable</span><span>${fmtINR(Cart.getTotal())}</span></div>
      </div>
    `;
  },

  loadSavedInfo() {
    const info = State.guestInfo;
    ['guestName','guestMobile','guestEmail','guestAddress','guestCity','guestState','guestPincode'].forEach(id => {
      const el = document.getElementById(id);
      const key = id.replace('guest', '').toLowerCase();
      if (el && info[key]) el.value = info[key];
    });
  },

  collectForm() {
    const get = id => document.getElementById(id)?.value?.trim() || '';
    const info = {
      name:    get('guestName'),
      mobile:  get('guestMobile'),
      email:   get('guestEmail'),
      address: get('guestAddress'),
      city:    get('guestCity'),
      state:   get('guestState'),
      pincode: get('guestPincode'),
    };
    State.guestInfo = info;
    State.save();
    return info;
  },

  validate(info) {
    const errors = {};
    if (!info.name || info.name.length < 2) errors.name = 'Enter your full name';
    if (!info.mobile || !/^[6-9]\d{9}$/.test(info.mobile)) errors.mobile = 'Enter valid 10-digit mobile';
    if (!info.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email)) errors.email = 'Enter valid email';
    if (!info.address || info.address.length < 10) errors.address = 'Enter complete address';
    if (!info.city) errors.city = 'Enter city';
    if (!info.state) errors.state = 'Select state';
    if (!info.pincode || !/^\d{6}$/.test(info.pincode)) errors.pincode = 'Enter valid 6-digit pincode';

    // Show errors in UI
    Object.entries(errors).forEach(([key, msg]) => {
      const el = document.getElementById(`guest${key.charAt(0).toUpperCase() + key.slice(1)}`);
      if (el) { el.classList.add('error'); }
      const errEl = document.getElementById(`err_guest${key.charAt(0).toUpperCase() + key.slice(1)}`);
      if (errEl) errEl.textContent = msg;
    });

    // Clear non-error fields
    ['name','mobile','email','address','city','state','pincode'].filter(k => !errors[k]).forEach(key => {
      const el = document.getElementById(`guest${key.charAt(0).toUpperCase() + key.slice(1)}`);
      if (el) el.classList.remove('error');
      const errEl = document.getElementById(`err_guest${key.charAt(0).toUpperCase() + key.slice(1)}`);
      if (errEl) errEl.textContent = '';
    });

    return Object.keys(errors).length === 0;
  },

  async proceedToPayment() {
    const info = this.collectForm();
    if (!this.validate(info)) {
      Toast.show('Please fill all required fields correctly', 'error');
      return;
    }

    const btn = document.getElementById('btnProceedPayment');
    if (btn) { btn.disabled = true; btn.textContent = 'Processing…'; }

    try {
      // 1. Create order in backend
      const orderData = {
        items: Cart.getItems().map(i => ({ product_id: i.id, quantity: i.quantity, size: i.selectedSize, price: i.price })),
        shipping_address: info,
        coupon_code: State.appliedCoupon?.code || null,
        subtotal: Cart.getSubtotal(),
        discount: Cart.getDiscount(),
        gst: Cart.getGST(),
        shipping: Cart.getShipping(),
        total: Cart.getTotal(),
      };

      const orderRes = await ApiService.createOrder(orderData);
      const orderId = orderRes.order_id || orderRes.id;

      // 2. Create Razorpay payment order
      const payRes = await ApiService.createPayment({ order_id: orderId, amount: Cart.getTotal() });

      // 3. Open Razorpay
      this.openRazorpay(payRes, info, orderId);

    } catch (err) {
      Toast.show(err.message || 'Payment initiation failed. Please try again.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Proceed to Pay'; }
    }
  },

  openRazorpay(payRes, info, orderId) {
    const options = {
      key: CONFIG.RAZORPAY_KEY,
      amount: payRes.amount,
      currency: payRes.currency || 'INR',
      order_id: payRes.razorpay_order_id || payRes.order_id,
      name: CONFIG.SITE_NAME,
      description: 'Jewellery Purchase',
      image: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💎</text></svg>',
      prefill: { name: info.name, email: info.email, contact: '+91' + info.mobile },
      theme: { color: '#C5933A' },
      modal: { ondismiss: () => {
        const btn = document.getElementById('btnProceedPayment');
        if (btn) { btn.disabled = false; btn.textContent = 'Proceed to Pay'; }
        Toast.show('Payment cancelled. Your items are still in the cart.', 'warning');
      }},
      handler: async (response) => {
        await this.verifyPayment(response, orderId);
      },
    };

    try {
      const rzp = new Razorpay(options);
      rzp.open();
    } catch {
      Toast.show('Razorpay could not be loaded. Please refresh and try again.', 'error');
      const btn = document.getElementById('btnProceedPayment');
      if (btn) { btn.disabled = false; btn.textContent = 'Proceed to Pay'; }
    }
  },

  async verifyPayment(response, orderId) {
    try {
      const verifyRes = await ApiService.verifyPayment({
        razorpay_order_id:   response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature:  response.razorpay_signature,
        order_id: orderId,
      });

      if (verifyRes.success || verifyRes.status === 'verified') {
        Cart.clear();
        window.location.href = `order-success.html?order_id=${orderId}&payment_id=${response.razorpay_payment_id}`;
      } else {
        Toast.show('Payment verification failed. Contact support with Payment ID: ' + response.razorpay_payment_id, 'error');
      }
    } catch (err) {
      Toast.show('Payment verification error: ' + err.message, 'error');
    }
  },

  loadRazorpayScript() {
    if (document.getElementById('razorpayScript')) return;
    const script = document.createElement('script');
    script.id = 'razorpayScript';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    document.head.appendChild(script);
  },

  bindEvents() {
    const btn = document.getElementById('btnProceedPayment');
    if (btn) btn.addEventListener('click', () => this.proceedToPayment());

    // Coupon in checkout
    const couponBtn = document.getElementById('checkoutCouponBtn');
    const couponInput = document.getElementById('checkoutCouponInput');
    if (couponBtn && couponInput) {
      couponBtn.addEventListener('click', async () => {
        await Cart.applyCoupon(couponInput.value);
        this.renderOrderSummary();
      });
    }
  },
};

/* --------------------------------------------------------------------------
   21. ORDER SUCCESS PAGE
   -------------------------------------------------------------------------- */
const OrderSuccess = {
  async init() {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    const paymentId = params.get('payment_id');

    if (!orderId) { window.location.href = 'index.html'; return; }

    const container = document.getElementById('orderSuccessContent');
    if (container) container.innerHTML = `<div class="loading-overlay"><div class="spinner"></div></div>`;

    try {
      const data = await ApiService.getOrder(orderId);
      const order = data.order || data;
      this.render(order, paymentId);
    } catch {
      // Fallback with basic info from URL
      this.renderBasic(orderId, paymentId);
    }
  },

  render(order, paymentId) {
    const container = document.getElementById('orderSuccessContent');
    if (!container) return;
    container.innerHTML = `
      <div class="success-hero">
        <div class="success-checkmark">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h1 style="font-family:var(--font-display);font-size:var(--fs-3xl);font-weight:300;margin-bottom:var(--sp-3);">Order Confirmed!</h1>
        <p style="color:var(--clr-text-secondary);">Thank you for your purchase. A confirmation email has been sent.</p>
      </div>
      <div class="order-summary-card">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);margin-bottom:var(--sp-6);">
          <div><div class="spec-label">Order ID</div><div class="spec-value" style="color:var(--clr-gold);">#${order.id || order.order_id}</div></div>
          <div><div class="spec-label">Payment Status</div><div class="spec-value" style="color:var(--clr-success);">✅ Paid</div></div>
          ${paymentId ? `<div><div class="spec-label">Payment ID</div><div class="spec-value">${paymentId}</div></div>` : ''}
          <div><div class="spec-label">Estimated Delivery</div><div class="spec-value">${order.estimated_delivery || '5-7 Business Days'}</div></div>
        </div>
        ${order.items ? `
          <div class="divider"></div>
          <div style="margin-top:var(--sp-4);">
            <h3 style="font-family:var(--font-display);font-size:var(--fs-lg);margin-bottom:var(--sp-4);">Items Ordered</h3>
            ${order.items.map(item => `
              <div style="display:flex;justify-content:space-between;padding:var(--sp-2) 0;font-size:var(--fs-sm);">
                <span style="color:var(--clr-text-secondary);">${item.name} × ${item.quantity}</span>
                <span style="color:var(--clr-gold);">${fmtINR(item.price * item.quantity)}</span>
              </div>
            `).join('')}
            <div class="divider"></div>
            <div style="display:flex;justify-content:space-between;font-weight:700;font-size:var(--fs-lg);">
              <span>Total Paid</span><span style="color:var(--clr-gold);">${fmtINR(order.total || 0)}</span>
            </div>
          </div>` : ''}
        ${order.shipping_address ? `
          <div class="divider"></div>
          <div style="margin-top:var(--sp-4);">
            <h3 style="font-family:var(--font-display);font-size:var(--fs-lg);margin-bottom:var(--sp-3);">Shipping To</h3>
            <p style="font-size:var(--fs-sm);color:var(--clr-text-secondary);line-height:var(--lh-loose);">
              ${order.shipping_address.name}<br>
              ${order.shipping_address.address}, ${order.shipping_address.city}, ${order.shipping_address.state} - ${order.shipping_address.pincode}<br>
              📞 ${order.shipping_address.mobile}
            </p>
          </div>` : ''}
      </div>
      <div style="display:flex;gap:var(--sp-4);justify-content:center;flex-wrap:wrap;margin-top:var(--sp-6);">
        <a href="order-tracking.html?order_id=${order.id || order.order_id}" class="btn btn-outline">📦 Track My Order</a>
        <a href="products.html" class="btn btn-primary">✦ Continue Shopping</a>
      </div>
    `;
  },

  renderBasic(orderId, paymentId) {
    const container = document.getElementById('orderSuccessContent');
    if (!container) return;
    container.innerHTML = `
      <div class="success-hero">
        <div class="success-checkmark">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h1 style="font-family:var(--font-display);font-size:var(--fs-3xl);font-weight:300;margin-bottom:var(--sp-3);">Order Placed Successfully!</h1>
        <p style="color:var(--clr-text-secondary);">Order ID: <strong style="color:var(--clr-gold);">#${orderId}</strong></p>
        ${paymentId ? `<p style="color:var(--clr-text-muted);font-size:var(--fs-sm);margin-top:var(--sp-2);">Payment ID: ${paymentId}</p>` : ''}
      </div>
      <div style="display:flex;gap:var(--sp-4);justify-content:center;margin-top:var(--sp-8);flex-wrap:wrap;">
        <a href="order-tracking.html?order_id=${orderId}" class="btn btn-outline">📦 Track Order</a>
        <a href="products.html" class="btn btn-primary">✦ Continue Shopping</a>
      </div>
    `;
  },
};

/* --------------------------------------------------------------------------
   22. ORDER TRACKING PAGE
   -------------------------------------------------------------------------- */
const OrderTracking = {
  statuses: [
    { key: 'pending',         label: 'Order Placed',          icon: '📋', desc: 'Your order has been received' },
    { key: 'confirmed',       label: 'Order Confirmed',       icon: '✅', desc: 'Payment verified, order confirmed' },
    { key: 'processing',      label: 'Processing',            icon: '⚙️', desc: 'Jewellery is being prepared' },
    { key: 'packed',          label: 'Packed',                icon: '📦', desc: 'Securely packed in vault packaging' },
    { key: 'shipped',         label: 'Shipped',               icon: '🚚', desc: 'Dispatched with insured courier' },
    { key: 'out_for_delivery',label: 'Out for Delivery',      icon: '🏃', desc: 'Almost there! Out for delivery' },
    { key: 'delivered',       label: 'Delivered',             icon: '🎉', desc: 'Successfully delivered' },
  ],
  cancelledStatus: { key: 'cancelled', label: 'Cancelled', icon: '❌', desc: 'Order has been cancelled' },
  returnedStatus:  { key: 'returned',  label: 'Returned',  icon: '↩️', desc: 'Return processed successfully' },

  async init() {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    if (orderId) {
      document.getElementById('trackOrderIdInput') && (document.getElementById('trackOrderIdInput').value = orderId);
      await this.track(orderId);
    }
    const form = document.getElementById('trackingForm');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); this.track(document.getElementById('trackOrderIdInput').value.trim()); });
  },

  async track(orderId) {
    if (!orderId) { Toast.show('Enter an Order ID', 'warning'); return; }
    const container = document.getElementById('trackingResult');
    if (!container) return;
    container.innerHTML = `<div class="loading-overlay"><div class="spinner"></div></div>`;

    try {
      const data = await ApiService.getOrder(orderId);
      const order = data.order || data;
      this.renderTimeline(order);
    } catch (err) {
      container.innerHTML = buildStateBox('🔍', 'Order not found', `No order found with ID "${orderId}". Please check and try again.`);
    }
  },

  renderTimeline(order) {
    const container = document.getElementById('trackingResult');
    if (!container) return;

    const currentStatus = (order.status || 'pending').toLowerCase();
    const isCancelled = currentStatus === 'cancelled';
    const isReturned  = currentStatus === 'returned';

    const statuses = isCancelled
      ? [...this.statuses.slice(0, 2), this.cancelledStatus]
      : isReturned
        ? [...this.statuses, this.returnedStatus]
        : this.statuses;

    const currentIndex = statuses.findIndex(s => s.key === currentStatus);

    const timeline = statuses.map((status, i) => {
      const isCompleted = i < currentIndex;
      const isActive    = i === currentIndex;
      const date = order.status_history?.[status.key] ? new Date(order.status_history[status.key]).toLocaleString('en-IN') : '';

      return `
        <div class="timeline-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}">
          <div class="timeline-dot">${isCompleted || isActive ? `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;">${isCompleted ? '✓' : ''}</span>` : ''}</div>
          <div class="timeline-title">${status.icon} ${status.label}</div>
          ${date ? `<div class="timeline-date">${date}</div>` : ''}
          ${isActive ? `<div class="timeline-desc">${status.desc}</div>` : ''}
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="order-summary-card" style="margin-bottom:var(--sp-6);">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--sp-4);">
          <div><div class="spec-label">Order ID</div><div class="spec-value" style="color:var(--clr-gold);">#${order.id || order.order_id}</div></div>
          <div><div class="spec-label">Status</div><div class="spec-value" style="text-transform:capitalize;">${currentStatus.replace(/_/g,' ')}</div></div>
          ${order.tracking_number ? `<div><div class="spec-label">Tracking No.</div><div class="spec-value">${order.tracking_number}</div></div>` : ''}
          ${order.estimated_delivery ? `<div><div class="spec-label">Est. Delivery</div><div class="spec-value">${order.estimated_delivery}</div></div>` : ''}
        </div>
      </div>
      <div class="tracking-timeline">
        ${timeline}
      </div>
    `;
  },
};

/* --------------------------------------------------------------------------
   23. CONTACT FORM
   -------------------------------------------------------------------------- */
async function handleContactSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  const data = {
    name:    form.querySelector('[name="name"]')?.value,
    email:   form.querySelector('[name="email"]')?.value,
    phone:   form.querySelector('[name="phone"]')?.value,
    subject: form.querySelector('[name="subject"]')?.value,
    message: form.querySelector('[name="message"]')?.value,
  };

  try {
    await ApiService.submitContact(data);
    Toast.show('Your message has been sent! We\'ll respond within 24 hours.', 'success', '📬');
    form.reset();
  } catch (err) {
    Toast.show(err.message || 'Message could not be sent. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Message';
  }
}

/* --------------------------------------------------------------------------
   24. REVIEW FORM SUBMISSION
   -------------------------------------------------------------------------- */
async function handleReviewSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('[type="submit"]');
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order_id');
  const productId = params.get('product_id');

  btn.disabled = true;
  btn.textContent = 'Submitting…';

  const data = {
    order_id:      orderId,
    product_id:    productId || form.querySelector('[name="product_id"]')?.value,
    reviewer_name: form.querySelector('[name="reviewer_name"]')?.value,
    email:         form.querySelector('[name="email"]')?.value,
    rating:        parseInt(form.querySelector('[name="rating"]:checked')?.value || '5'),
    text:          form.querySelector('[name="text"]')?.value,
  };

  try {
    await ApiService.submitReview(data);
    Toast.show('Review submitted! It will appear after approval.', 'success', '⭐');
    form.reset();
    form.style.display = 'none';
    const thanks = document.getElementById('reviewThanks');
    if (thanks) thanks.style.display = 'block';
  } catch (err) {
    Toast.show(err.message || 'Review submission failed.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit Review';
  }
}

/* --------------------------------------------------------------------------
   25. HELPER UTILITIES
   -------------------------------------------------------------------------- */
function buildStateBox(icon, title, desc) {
  return `
    <div class="state-box">
      <div class="state-icon">${icon}</div>
      <div class="state-title">${title}</div>
      <p class="state-desc">${desc}</p>
    </div>
  `;
}

function showTab(tabName) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById(`tab-${tabName}`);
  if (panel) panel.classList.add('active');
  event?.target?.classList?.add('active');
}

function copyCode(code) {
  navigator.clipboard.writeText(code).then(() => Toast.show(`Code "${code}" copied!`, 'success', '📋')).catch(() => Toast.show('Copy failed', 'error'));
}

function observeFadeIns(container) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } });
  }, { threshold: 0.1 });
  container.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

function observeAllFadeIns() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } });
  }, { threshold: 0.08 });
  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

/* --------------------------------------------------------------------------
   26. HEADER SCROLL EFFECT & BACK TO TOP
   -------------------------------------------------------------------------- */
function setupScrollEffects() {
  const header = document.querySelector('.main-header');
  const backTop = document.getElementById('backToTop');

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (header) header.classList.toggle('scrolled', scrollY > 80);
    if (backTop) backTop.classList.toggle('visible', scrollY > 500);
  }, { passive: true });

  if (backTop) backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function scrollToCatalog() {
  const el = document.getElementById('catalogSection') || document.getElementById('productsSection');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

/* --------------------------------------------------------------------------
   27. MOBILE FILTER TOGGLE
   -------------------------------------------------------------------------- */
function toggleMobileFilter() {
  const sidebar = document.getElementById('filterSidebar');
  if (sidebar) sidebar.classList.toggle('mobile-open');
}

/* --------------------------------------------------------------------------
   28. PAGE ROUTER — Detect current page and initialize
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize common systems
  State.init();
  Toast.init();
  updateCartBadge();
  updateWishlistBadge();
  setupScrollEffects();
  observeAllFadeIns();

  // Drawer overlay click to close
  const overlay = document.getElementById('drawerOverlay');
  if (overlay) overlay.addEventListener('click', closeAllDrawers);

  // Mobile nav
  const hamburger = document.getElementById('hamburgerBtn');
  if (hamburger) hamburger.addEventListener('click', openMobileNav);
  const navBackdrop = document.getElementById('mobileNavBackdrop');
  if (navBackdrop) navBackdrop.addEventListener('click', closeMobileNav);

  // Newsletter form
  const nlForm = document.getElementById('newsletterForm');
  if (nlForm) nlForm.addEventListener('submit', handleNewsletterSubmit);

  // Contact form
  const contactForm = document.getElementById('contactForm');
  if (contactForm) contactForm.addEventListener('submit', handleContactSubmit);

  // Review form
  const reviewForm = document.getElementById('reviewForm');
  if (reviewForm) reviewForm.addEventListener('submit', handleReviewSubmit);

  // Header search
  const searchInput = document.getElementById('headerSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', handleHeaderSearch);
    searchInput.addEventListener('keydown', handleSearchKeydown);
  }
  // Close suggestions on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.header-search-wrap')) closeSuggestions();
  });

  // Detect page & initialize
  const path = window.location.pathname.toLowerCase();
  const page = path.split('/').pop().replace('.html', '') || 'index';

  if (page === 'index' || page === '' || page === '/') {
    // Home page
    loadLiveRates();
    loadHero();
    loadCategories('categoriesGrid');
    loadProductSection('newArrivalsGrid',   { is_new_arrival: true, limit: 8 });
    loadProductSection('bestSellersGrid',   { is_bestseller: true, limit: 8 });
    loadProductSection('trendingGrid',      { is_trending: true, limit: 8 });
    loadOffers('offersGrid');
    loadReviews('reviewsGrid');
    loadStoreInfo();
  } else if (page === 'products' || page === 'search') {
    ProductListing.init();
  } else if (page === 'product-detail') {
    ProductDetail.init();
  } else if (page === 'checkout') {
    Checkout.init();
  } else if (page === 'order-success') {
    OrderSuccess.init();
  } else if (page === 'order-tracking') {
    OrderTracking.init();
  }

  // Re-render drawers on open
  document.querySelectorAll('[data-open-drawer]').forEach(btn => {
    btn.addEventListener('click', () => {
      const drawerId = btn.dataset.openDrawer;
      if (drawerId === 'cartDrawer') renderCartDrawer();
      if (drawerId === 'wishlistDrawer') renderWishlistDrawer();
      openDrawer(drawerId);
    });
  });

  // Sync user authentication state across all pages
  syncUserNav();
});

function syncUserNav() {
  try {
    const rawUser = localStorage.getItem('SSJ_USER');
    if (rawUser) {
      const user = JSON.parse(rawUser);
      const userBtn = document.getElementById('userNavBtn');
      const badge = document.getElementById('userLoggedBadge');
      if (userBtn && user) {
        userBtn.title = `Hi, ${user.name || 'User'} — My Account`;
        if (badge) badge.style.display = 'block';
      }
    }
  } catch (_) {}
}

