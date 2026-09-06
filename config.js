/* ==========================================================================
   SHREE SAI JEWELLERS — CONFIGURATION
   Single source of truth for all environment-specific settings.
   Replace API_BASE_URL and RAZORPAY_KEY before deploying to production.
   ========================================================================== */

const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1' ||
  window.location.protocol === 'file:'
);

const CONFIG = {
  // Auto-detect local vs production API URL
  API_BASE_URL: isLocalhost 
    ? (window.location.port === '5000' ? `${window.location.origin}/api` : 'http://localhost:5000/api')
    : 'https://shree-sai-jewellers.onrender.com/api',

  // Razorpay public key — NEVER put the secret key here
  RAZORPAY_KEY: 'rzp_test_XXXXXXXXXXXXXXXX',

  // Google OAuth 2.0 Client ID (from Google Cloud Console)
  GOOGLE_CLIENT_ID: '946309476279-h5gvo9lngoq1vfsbr6r286j0cp7a8gkq.apps.googleusercontent.com',

  // Currency
  CURRENCY_SYMBOL: '₹',
  CURRENCY_LOCALE: 'en-IN',

  // GST on jewellery (3% for gold/silver, 18% for services — using 3% for product)
  GST_RATE: 0.03,

  // Shipping
  FREE_SHIPPING_THRESHOLD: 50000,  // Free shipping above ₹50,000
  SHIPPING_FEE: 1500,              // ₹1,500 insured vault delivery

  // Pagination
  PRODUCTS_PER_PAGE: 12,

  // Search debounce delay (ms)
  SEARCH_DEBOUNCE: 400,

  // Cart/Wishlist localStorage keys
  STORAGE_KEYS: {
    CART: 'SSJ_CART_V2',
    WISHLIST: 'SSJ_WISHLIST_V2',
    GUEST_INFO: 'SSJ_GUEST_INFO',
  },

  // Default fallback gold rates (shown when API unavailable)
  DEFAULT_RATES: {
    gold24k: 7480,
    gold22k: 6890,
    silver999: 91.5,
  },

  // Site metadata
  SITE_NAME: 'Shree Sai Jewellers',
  SITE_TAGLINE: 'Fine Heirloom Jewellery · Est. 1984',
  SITE_PHONE: '+91 98765 43210',
  WHATSAPP_PHONE: '919876543210',
  SITE_EMAIL: 'care@shreesaijewellers.com',
  SITE_ADDRESS: 'Shree Sai Jewellers, Main Market, Indore, Madhya Pradesh - 452009',
  SITE_MAPS_URL: 'https://maps.app.goo.gl/JpumezhtKE9LDbo37',
  STORE_HOURS: 'Mon–Sat: 10:00 AM – 8:00 PM  |  Sun: 11:00 AM – 6:00 PM',
};

// Freeze to prevent accidental mutations
Object.freeze(CONFIG);
Object.freeze(CONFIG.STORAGE_KEYS);
Object.freeze(CONFIG.DEFAULT_RATES);
