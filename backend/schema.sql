-- ==============================================================================
-- SHREE SAI JEWELLERS — SUPABASE POSTGRESQL DATABASE SCHEMA
-- Run this script in the Supabase SQL Editor to create all required tables.
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    slug VARCHAR(128) NOT NULL UNIQUE,
    icon VARCHAR(32) DEFAULT '💎',
    image_url TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    sku VARCHAR(64) UNIQUE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    category_id VARCHAR(64) REFERENCES categories(id) ON DELETE SET NULL,
    category_name VARCHAR(128),
    jewellery_type VARCHAR(64) DEFAULT 'Gold',
    metal VARCHAR(128) DEFAULT '22K Yellow Gold',
    purity VARCHAR(64) DEFAULT '22KT (916)',
    gross_weight VARCHAR(64),
    net_weight VARCHAR(64),
    making_charges VARCHAR(64),
    stone_charges VARCHAR(64),
    gold_rate NUMERIC(10, 2) DEFAULT 0,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    original_price NUMERIC(12, 2),
    discount_percent INT DEFAULT 0,
    stock INT NOT NULL DEFAULT 10,
    sizes JSONB DEFAULT '[]'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    badge VARCHAR(64),
    certificate VARCHAR(128) DEFAULT 'BIS 916 Hallmarked',
    diamond_carat VARCHAR(64),
    diamond_clarity VARCHAR(64),
    diamond_color VARCHAR(64),
    is_bestseller BOOLEAN DEFAULT FALSE,
    is_trending BOOLEAN DEFAULT FALSE,
    is_new_arrival BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. BANNERS TABLE
CREATE TABLE IF NOT EXISTS banners (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(64) DEFAULT 'hero',
    eyebrow VARCHAR(128),
    title TEXT NOT NULL,
    title_gold VARCHAR(255),
    description TEXT,
    image_url TEXT NOT NULL,
    cta_primary_text VARCHAR(64) DEFAULT 'Explore Collection',
    cta_primary_url VARCHAR(255) DEFAULT 'products.html',
    cta_secondary_text VARCHAR(64) DEFAULT 'Royal Bridal Sets',
    cta_secondary_url VARCHAR(255) DEFAULT 'products.html?category=Bridal',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. OFFERS TABLE
CREATE TABLE IF NOT EXISTS offers (
    id VARCHAR(64) PRIMARY KEY,
    tag VARCHAR(64) DEFAULT 'Special Offer',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    coupon_code VARCHAR(64),
    discount_percent INT DEFAULT 0,
    flat_discount NUMERIC(10, 2) DEFAULT 0,
    min_order NUMERIC(10, 2) DEFAULT 0,
    valid_till DATE,
    category VARCHAR(128),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. DAILY RATES TABLE
CREATE TABLE IF NOT EXISTS rates (
    id SERIAL PRIMARY KEY,
    gold_24k NUMERIC(10, 2) NOT NULL DEFAULT 7480.00,
    gold_22k NUMERIC(10, 2) NOT NULL DEFAULT 6890.00,
    silver_999 NUMERIC(10, 2) NOT NULL DEFAULT 91.50,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(64) PRIMARY KEY,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
    reviewer_name VARCHAR(128) NOT NULL,
    email VARCHAR(255),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text TEXT NOT NULL,
    verified_purchase BOOLEAN DEFAULT FALSE,
    approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. COUPONS TABLE
CREATE TABLE IF NOT EXISTS coupons (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    description TEXT,
    discount_percent INT DEFAULT 0,
    flat_discount NUMERIC(10, 2) DEFAULT 0,
    min_order NUMERIC(10, 2) DEFAULT 0,
    max_discount NUMERIC(10, 2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    guest_name VARCHAR(128) NOT NULL,
    guest_mobile VARCHAR(20) NOT NULL,
    guest_email VARCHAR(255) NOT NULL,
    shipping_address JSONB NOT NULL,
    coupon_code VARCHAR(64),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    gst NUMERIC(12, 2) NOT NULL DEFAULT 0,
    shipping NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(64) NOT NULL DEFAULT 'confirmed',
    razorpay_order_id VARCHAR(128),
    razorpay_payment_id VARCHAR(128),
    tracking_number VARCHAR(128),
    status_history JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64),
    product_name VARCHAR(255) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    size VARCHAR(32)
);

-- 10. CONTACT INQUIRIES TABLE
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. NEWSLETTER SUBSCRIBERS TABLE
CREATE TABLE IF NOT EXISTS subscribers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. STORE INFO TABLE
CREATE TABLE IF NOT EXISTS store_info (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) DEFAULT 'Shree Sai Jewellers',
    tagline VARCHAR(255) DEFAULT 'Fine Heirloom Jewellery · Est. 1984',
    address TEXT DEFAULT 'Shree Sai Jewellers, Main Market, Indore, Madhya Pradesh - 452009',
    phone VARCHAR(64) DEFAULT '+91 98765 43210',
    email VARCHAR(128) DEFAULT 'care@shreesaijewellers.com',
    hours TEXT DEFAULT 'Mon–Sat: 10:00 AM – 8:00 PM  |  Sun: 11:00 AM – 6:00 PM',
    maps_url TEXT DEFAULT 'https://maps.app.goo.gl/JpumezhtKE9LDbo37',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. USERS TABLE (Authentication)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(32),
    password_hash VARCHAR(512) NOT NULL,
    role VARCHAR(32) DEFAULT 'customer',
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- 14. PASSWORD RESET TOKENS TABLE
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration: add role column if upgrading from older schema
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(32) DEFAULT 'customer';


-- Insert initial store info & rate records if empty
INSERT INTO rates (id, gold_24k, gold_22k, silver_999, updated_at)
VALUES (1, 7480.00, 6890.00, 91.50, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO store_info (id, name, tagline, address, phone, email, hours, maps_url)
VALUES (1, 'Shree Sai Jewellers', 'Fine Heirloom Jewellery · Est. 1984', 'Shree Sai Jewellers, Main Market, Indore, Madhya Pradesh - 452009', '+91 98765 43210', 'care@shreesaijewellers.com', 'Mon–Sat: 10:00 AM – 8:00 PM  |  Sun: 11:00 AM – 6:00 PM', 'https://maps.app.goo.gl/JpumezhtKE9LDbo37')
ON CONFLICT (id) DO NOTHING;
