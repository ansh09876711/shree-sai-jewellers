"""
Seed Script to populate Supabase PostgreSQL with Fine Jewellery Data
Usage: python -m backend.seed
"""

import sys
import datetime
from .database import SessionLocal, engine, Base
from .models import Category, Product, Banner, Offer, Rate, Coupon, StoreInfo, Review

def seed_database():
    print("[Seed] Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Categories
        print("[Seed] Populating Categories...")
        categories_data = [
            {"id": "cat_rings", "name": "Rings", "slug": "rings", "icon": "💍", "image_url": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80", "sort_order": 1},
            {"id": "cat_necklaces", "name": "Necklaces", "slug": "necklaces", "icon": "✨", "image_url": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80", "sort_order": 2},
            {"id": "cat_earrings", "name": "Earrings", "slug": "earrings", "icon": "💎", "image_url": "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80", "sort_order": 3},
            {"id": "cat_bangles", "name": "Bangles", "slug": "bangles", "icon": "💫", "image_url": "https://images.unsplash.com/photo-1611591475102-446738b50f75?auto=format&fit=crop&w=800&q=80", "sort_order": 4},
            {"id": "cat_bracelets", "name": "Bracelets", "slug": "bracelets", "icon": "👑", "image_url": "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=800&q=80", "sort_order": 5},
            {"id": "cat_chains", "name": "Chains", "slug": "chains", "icon": "🔗", "image_url": "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=800&q=80", "sort_order": 6}
        ]

        for c_data in categories_data:
            existing = db.query(Category).filter(Category.id == c_data["id"]).first()
            if not existing:
                db.add(Category(**c_data))

        db.flush()

        # 2. Products
        print("[Seed] Populating Products...")
        products_data = [
            {
                "id": "prod_solitaire_ring",
                "sku": "SSJ-RNG-001",
                "name": "The Empress Solitaire Diamond Ring",
                "slug": "the-empress-solitaire-diamond-ring",
                "description": "Crafted with an exquisite 1.25 Carat round brilliant IGI certified diamond set in handcrafted 18K White Gold micro-pavé band.",
                "category_id": "cat_rings",
                "category_name": "Rings",
                "jewellery_type": "Diamond",
                "metal": "18K White Gold",
                "purity": "18KT (750)",
                "gross_weight": "4.85 g",
                "net_weight": "4.60 g",
                "making_charges": "₹6,500",
                "stone_charges": "₹1,20,000",
                "gold_rate": 6890.00,
                "price": 185000.00,
                "original_price": 210000.00,
                "discount_percent": 12,
                "stock": 8,
                "sizes": ["12", "14", "16", "18"],
                "images": [
                    "https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=800&auto=format&fit=crop",
                    "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?q=80&w=800&auto=format&fit=crop"
                ],
                "badge": "bestseller",
                "certificate": "IGI Certified · VVS1 Clarity",
                "diamond_carat": "1.25 ct",
                "diamond_clarity": "VVS1",
                "diamond_color": "E (Colorless)",
                "is_bestseller": True,
                "is_trending": True,
                "is_new_arrival": False
            },
            {
                "id": "prod_kundan_necklace",
                "sku": "SSJ-NCK-002",
                "name": "Maharani Royal Kundan Choker Set",
                "slug": "maharani-royal-kundan-choker-set",
                "description": "Heritage Jadau Kundan choker handcrafted in 22K hallmarked gold with Zambian emerald drops and South Sea natural pearls.",
                "category_id": "cat_necklaces",
                "category_name": "Necklaces",
                "jewellery_type": "Bridal",
                "metal": "22K Yellow Gold",
                "purity": "22KT (916)",
                "gross_weight": "68.40 g",
                "net_weight": "54.20 g",
                "making_charges": "₹28,000",
                "stone_charges": "₹65,000",
                "gold_rate": 7480.00,
                "price": 465000.00,
                "original_price": 510000.00,
                "discount_percent": 9,
                "stock": 4,
                "sizes": ["Standard Adjustable"],
                "images": [
                    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=800&auto=format&fit=crop",
                    "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=800&auto=format&fit=crop"
                ],
                "badge": "bridal",
                "certificate": "BIS 916 Hallmarked · SGL Certified",
                "is_bestseller": True,
                "is_trending": False,
                "is_new_arrival": True
            },
            {
                "id": "prod_diamond_jhumkas",
                "sku": "SSJ-EAR-003",
                "name": "Nawabi Diamond & Polki Drop Earrings",
                "slug": "nawabi-diamond-polki-drop-earrings",
                "description": "Intricately detailed 22K gold chandelier earrings crowned with brilliant uncut polki diamonds and ruby cabochons.",
                "category_id": "cat_earrings",
                "category_name": "Earrings",
                "jewellery_type": "Gold",
                "metal": "22K Yellow Gold",
                "purity": "22KT (916)",
                "gross_weight": "18.50 g",
                "net_weight": "16.20 g",
                "making_charges": "₹12,000",
                "stone_charges": "₹35,000",
                "gold_rate": 7480.00,
                "price": 142000.00,
                "original_price": 155000.00,
                "discount_percent": 8,
                "stock": 12,
                "sizes": ["One Size"],
                "images": [
                    "https://images.unsplash.com/photo-1630019852942-f89202989a59?q=80&w=800&auto=format&fit=crop"
                ],
                "badge": "trending",
                "certificate": "BIS 916 Hallmarked",
                "is_bestseller": False,
                "is_trending": True,
                "is_new_arrival": True
            },
            {
                "id": "prod_gold_kada_bangle",
                "sku": "SSJ-BNG-004",
                "name": "Aethelgard Hand-Carved Royal Gold Kada",
                "slug": "aethelgard-hand-carved-royal-gold-kada",
                "description": "Solid 22K hallmarked yellow gold kada with antique filigree engraving and screw clasp mechanism.",
                "category_id": "cat_bangles",
                "category_name": "Bangles",
                "jewellery_type": "Gold",
                "metal": "22K Yellow Gold",
                "purity": "22KT (916)",
                "gross_weight": "32.10 g",
                "net_weight": "32.10 g",
                "making_charges": "₹14,500",
                "gold_rate": 7480.00,
                "price": 255000.00,
                "original_price": 275000.00,
                "discount_percent": 7,
                "stock": 6,
                "sizes": ["2.4", "2.6", "2.8"],
                "images": [
                    "https://images.unsplash.com/photo-1611591475155-4284ec28d351?q=80&w=800&auto=format&fit=crop"
                ],
                "badge": "new",
                "certificate": "BIS 916 Hallmarked",
                "is_bestseller": True,
                "is_trending": True,
                "is_new_arrival": True
            }
        ]

        for p_data in products_data:
            existing = db.query(Product).filter(Product.id == p_data["id"]).first()
            if not existing:
                db.add(Product(**p_data))

        # 3. Banners
        print("[Seed] Populating Banners...")
        banner_data = {
            "id": "banner_hero_main",
            "type": "hero",
            "eyebrow": "Heritage Collection 2026",
            "title": "Timeless Elegance,",
            "title_gold": "Crafted for Generations",
            "description": "Discover our bespoke collection of handcrafted 22K certified gold, solitaire diamonds, and fine heirloom jewellery — forged with century-old artisanal mastery.",
            "image_url": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1920&auto=format&fit=crop",
            "cta_primary_text": "✦ Explore Collection",
            "cta_primary_url": "products.html",
            "cta_secondary_text": "Gold Collection",
            "cta_secondary_url": "products.html?jewellery_type=Gold"
        }
        if not db.query(Banner).filter(Banner.id == banner_data["id"]).first():
            db.add(Banner(**banner_data))

        # 4. Offers
        print("[Seed] Populating Offers...")
        offers_data = [
            {"id": "off_festive10", "tag": "Festive Special", "title": "10% Off Making Charges", "description": "Enjoy 10% flat discount on gold & diamond making charges on orders above ₹1,00,000.", "coupon_code": "SAI10", "discount_percent": 10, "min_order": 100000.0, "valid_till": datetime.date(2026, 12, 31)},
            {"id": "off_bridal_flat", "tag": "Bridal Season", "title": "Flat ₹15,000 Off on Bridal Sets", "description": "Exclusive bridal promotion for wedding season purchases above ₹3,00,000.", "coupon_code": "BRIDAL15", "flat_discount": 15000.0, "min_order": 300000.0, "valid_till": datetime.date(2026, 11, 30)}
        ]
        for o_data in offers_data:
            if not db.query(Offer).filter(Offer.id == o_data["id"]).first():
                db.add(Offer(**o_data))

        # 5. Coupons
        print("[Seed] Populating Coupons...")
        coupons_data = [
            {"id": "c_sai10", "code": "SAI10", "description": "10% off on your luxury jewellery purchase", "discount_percent": 10, "min_order": 50000.0, "max_discount": 20000.0},
            {"id": "c_welcome", "code": "WELCOME", "description": "Flat ₹5,000 off on your first order", "flat_discount": 5000.0, "min_order": 75000.0}
        ]
        for cp_data in coupons_data:
            if not db.query(Coupon).filter(Coupon.code == cp_data["code"]).first():
                db.add(Coupon(**cp_data))

        # 6. Reviews
        print("[Seed] Populating Verified Reviews...")
        reviews_data = [
            {"id": "rev_1", "reviewer_name": "Pooja Sharma", "email": "pooja@example.com", "rating": 5, "text": "The Empress Solitaire ring exceeded all expectations. Hallmarking and IGI certificate were included in tamper-proof packaging.", "verified_purchase": True},
            {"id": "rev_2", "reviewer_name": "Rajesh Varma", "email": "rajesh@example.com", "rating": 5, "text": "Purchased a royal bridal necklace for my daughter's wedding in Indore. Truly exceptional heirloom craftsmanship.", "verified_purchase": True},
            {"id": "rev_3", "reviewer_name": "Meera Patel", "email": "meera@example.com", "rating": 5, "text": "Prompt response on WhatsApp and transparent gold rate breakdown. 10/10 recommended fine jewellery house.", "verified_purchase": True}
        ]
        for r_data in reviews_data:
            if not db.query(Review).filter(Review.id == r_data["id"]).first():
                db.add(Review(**r_data))

        db.commit()
        print("[Seed] Database seeding completed successfully! ✨")
    except Exception as e:
        db.rollback()
        print(f"[Seed Error] {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
