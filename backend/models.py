import datetime
from sqlalchemy import (
    Column, String, Text, Integer, Numeric, Boolean, Date, DateTime, JSON, ForeignKey
)
from sqlalchemy.orm import relationship
from .database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False, unique=True)
    slug = Column(String(128), nullable=False, unique=True)
    icon = Column(String(32), default="💎")
    image_url = Column(Text)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    products = relationship("Product", back_populates="category")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "icon": self.icon,
            "image": self.image_url,
            "img": self.image_url,
            "product_count": len([p for p in self.products if p.is_active]) if self.products else 0
        }

class Product(Base):
    __tablename__ = "products"

    id = Column(String(64), primary_key=True)
    sku = Column(String(64), unique=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True)
    description = Column(Text)
    category_id = Column(String(64), ForeignKey("categories.id"))
    category_name = Column(String(128))
    jewellery_type = Column(String(64), default="Gold")
    metal = Column(String(128), default="22K Yellow Gold")
    purity = Column(String(64), default="22KT (916)")
    gross_weight = Column(String(64))
    net_weight = Column(String(64))
    making_charges = Column(String(64))
    stone_charges = Column(String(64))
    gold_rate = Column(Numeric(10, 2), default=0.0)
    price = Column(Numeric(12, 2), nullable=False, default=0.0)
    original_price = Column(Numeric(12, 2))
    discount_percent = Column(Integer, default=0)
    stock = Column(Integer, nullable=False, default=10)
    sizes = Column(JSON, default=list)
    images = Column(JSON, default=list)
    badge = Column(String(64))
    certificate = Column(String(128), default="BIS 916 Hallmarked")
    diamond_carat = Column(String(64))
    diamond_clarity = Column(String(64))
    diamond_color = Column(String(64))
    is_bestseller = Column(Boolean, default=False)
    is_trending = Column(Boolean, default=False)
    is_new_arrival = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    category = relationship("Category", back_populates="products")

    def to_dict(self):
        return {
            "id": self.id,
            "sku": self.sku or self.id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "category": self.category_name or (self.category.name if self.category else ""),
            "category_id": self.category_id,
            "jewellery_type": self.jewellery_type,
            "metal": self.metal,
            "purity": self.purity,
            "gross_weight": self.gross_weight,
            "net_weight": self.net_weight,
            "making_charges": self.making_charges,
            "stone_charges": self.stone_charges,
            "gold_rate": float(self.gold_rate) if self.gold_rate else None,
            "price": float(self.price),
            "original_price": float(self.original_price) if self.original_price else None,
            "originalPrice": float(self.original_price) if self.original_price else None,
            "discount_percent": self.discount_percent,
            "discountPercent": self.discount_percent,
            "stock": self.stock,
            "sizes": self.sizes or [],
            "images": self.images or [],
            "image": self.images[0] if self.images and len(self.images) > 0 else "",
            "badge": self.badge,
            "certificate": self.certificate,
            "diamond_carat": self.diamond_carat,
            "diamond_clarity": self.diamond_clarity,
            "diamond_color": self.diamond_color,
            "is_bestseller": self.is_bestseller,
            "is_trending": self.is_trending,
            "is_new_arrival": self.is_new_arrival,
            "is_active": self.is_active
        }

class Banner(Base):
    __tablename__ = "banners"

    id = Column(String(64), primary_key=True)
    type = Column(String(64), default="hero")
    eyebrow = Column(String(128))
    title = Column(Text, nullable=False)
    title_gold = Column(String(255))
    description = Column(Text)
    image_url = Column(Text, nullable=False)
    cta_primary_text = Column(String(64), default="Explore Collection")
    cta_primary_url = Column(String(255), default="products.html")
    cta_secondary_text = Column(String(64), default="Gold Collection")
    cta_secondary_url = Column(String(255), default="products.html?jewellery_type=Gold")
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "position": self.type,
            "eyebrow": self.eyebrow,
            "title": self.title,
            "title_gold": self.title_gold,
            "description": self.description,
            "image": self.image_url,
            "cta_primary_text": self.cta_primary_text,
            "cta_primary_url": self.cta_primary_url,
            "cta_secondary_text": self.cta_secondary_text,
            "cta_secondary_url": self.cta_secondary_url
        }

class Offer(Base):
    __tablename__ = "offers"

    id = Column(String(64), primary_key=True)
    tag = Column(String(64), default="Special Offer")
    title = Column(String(255), nullable=False)
    description = Column(Text)
    coupon_code = Column(String(64))
    discount_percent = Column(Integer, default=0)
    flat_discount = Column(Numeric(10, 2), default=0.0)
    min_order = Column(Numeric(10, 2), default=0.0)
    valid_till = Column(Date)
    category = Column(String(128))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "tag": self.tag,
            "title": self.title,
            "description": self.description,
            "coupon_code": self.coupon_code,
            "discount_percent": self.discount_percent,
            "flat_discount": float(self.flat_discount) if self.flat_discount else None,
            "min_order": float(self.min_order) if self.min_order else None,
            "valid_till": self.valid_till.isoformat() if self.valid_till else None,
            "category": self.category
        }

class Rate(Base):
    __tablename__ = "rates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    gold_24k = Column(Numeric(10, 2), nullable=False, default=7480.00)
    gold_22k = Column(Numeric(10, 2), nullable=False, default=6890.00)
    silver_999 = Column(Numeric(10, 2), nullable=False, default=91.50)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "gold_24k": float(self.gold_24k),
            "gold24k": float(self.gold_24k),
            "gold_22k": float(self.gold_22k),
            "gold22k": float(self.gold_22k),
            "silver_999": float(self.silver_999),
            "silver999": float(self.silver_999),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

class Review(Base):
    __tablename__ = "reviews"

    id = Column(String(64), primary_key=True)
    product_id = Column(String(64), ForeignKey("products.id"))
    reviewer_name = Column(String(128), nullable=False)
    email = Column(String(255))
    rating = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    verified_purchase = Column(Boolean, default=False)
    approved = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "reviewer_name": self.reviewer_name,
            "name": self.reviewer_name,
            "email": self.email,
            "rating": self.rating,
            "text": self.text,
            "review": self.text,
            "content": self.text,
            "verified_purchase": self.verified_purchase,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(String(64), primary_key=True)
    code = Column(String(64), nullable=False, unique=True)
    description = Column(Text)
    discount_percent = Column(Integer, default=0)
    flat_discount = Column(Numeric(10, 2), default=0.0)
    min_order = Column(Numeric(10, 2), default=0.0)
    max_discount = Column(Numeric(10, 2))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "description": self.description,
            "discount_percent": self.discount_percent,
            "flat_discount": float(self.flat_discount) if self.flat_discount else None,
            "min_order": float(self.min_order) if self.min_order else None,
            "max_discount": float(self.max_discount) if self.max_discount else None
        }

class Order(Base):
    __tablename__ = "orders"

    id = Column(String(64), primary_key=True)
    guest_name = Column(String(128), nullable=False)
    guest_mobile = Column(String(20), nullable=False)
    guest_email = Column(String(255), nullable=False)
    shipping_address = Column(JSON, nullable=False)
    coupon_code = Column(String(64))
    subtotal = Column(Numeric(12, 2), nullable=False, default=0.0)
    discount = Column(Numeric(12, 2), nullable=False, default=0.0)
    gst = Column(Numeric(12, 2), nullable=False, default=0.0)
    shipping = Column(Numeric(12, 2), nullable=False, default=0.0)
    total = Column(Numeric(12, 2), nullable=False, default=0.0)
    status = Column(String(64), nullable=False, default="confirmed")
    razorpay_order_id = Column(String(128))
    razorpay_payment_id = Column(String(128))
    tracking_number = Column(String(128))
    status_history = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.id,
            "guest_name": self.guest_name,
            "guest_mobile": self.guest_mobile,
            "guest_email": self.guest_email,
            "shipping_address": self.shipping_address,
            "coupon_code": self.coupon_code,
            "subtotal": float(self.subtotal),
            "discount": float(self.discount),
            "gst": float(self.gst),
            "shipping": float(self.shipping),
            "total": float(self.total),
            "status": self.status,
            "razorpay_order_id": self.razorpay_order_id,
            "razorpay_payment_id": self.razorpay_payment_id,
            "tracking_number": self.tracking_number,
            "status_history": self.status_history or {},
            "items": [item.to_dict() for item in self.items],
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String(64), ForeignKey("orders.id"), nullable=False)
    product_id = Column(String(64))
    product_name = Column(String(255), nullable=False)
    price = Column(Numeric(12, 2), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    size = Column(String(32))

    order = relationship("Order", back_populates="items")

    def to_dict(self):
        return {
            "product_id": self.product_id,
            "name": self.product_name,
            "price": float(self.price),
            "quantity": self.quantity,
            "size": self.size
        }

class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(32), nullable=False)
    subject = Column(String(255))
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

class Subscriber(Base):
    __tablename__ = "subscribers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    phone = Column(String(32))
    password_hash = Column(String(512), nullable=False)
    role = Column(String(32), default="customer")  # "admin" or "customer"
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    last_login = Column(DateTime(timezone=True))

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone or "",
            "role": self.role or "customer",
            "is_admin": (self.role == "admin" or self.email.lower() in ["shreesaijewellers3@gmail.com", "admin@shreesaijewellers.com"]),
            "is_verified": self.is_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=False)
    token = Column(String(128), nullable=False, unique=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    admin_email = Column(String(255), nullable=False)
    action = Column(String(128), nullable=False)
    entity = Column(String(64))
    entity_id = Column(String(128))
    details = Column(Text)
    ip_address = Column(String(64))
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "admin": self.admin_email,
            "action": self.action,
            "entity": self.entity,
            "entity_id": self.entity_id,
            "details": self.details,
            "ip_address": self.ip_address,
            "created_at": self.created_at.strftime("%d %b %Y, %I:%M %p") if self.created_at else None
        }



class StoreInfo(Base):
    __tablename__ = "store_info"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128), default="Shree Sai Jewellers")
    tagline = Column(String(255), default="Fine Heirloom Jewellery · Est. 1984")
    address = Column(Text, default="Shree Sai Jewellers, Main Market, Indore, Madhya Pradesh - 452009")
    phone = Column(String(64), default="+91 98765 43210")
    email = Column(String(128), default="care@shreesaijewellers.com")
    hours = Column(Text, default="Mon–Sat: 10:00 AM – 8:00 PM  |  Sun: 11:00 AM – 6:00 PM")
    maps_url = Column(Text, default="https://maps.app.goo.gl/JpumezhtKE9LDbo37")
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "name": self.name,
            "tagline": self.tagline,
            "address": self.address,
            "phone": self.phone,
            "email": self.email,
            "hours": self.hours,
            "store_hours": self.hours,
            "maps_url": self.maps_url
        }
