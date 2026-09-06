import os
import shutil
from flask import Blueprint, jsonify
from sqlalchemy import asc
from ..database import SessionLocal
from ..models import Banner

banners_bp = Blueprint("banners", __name__, url_prefix="/api/banners")

@banners_bp.route("", methods=["GET"])
def get_banners():
    # Ensure local luxury hero background is in place
    try:
        dest_hero = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "images", "hero_bg.jpg"))
        src_hero = r"C:\Users\ANSH AGARWAL\.gemini\antigravity-ide\brain\85bdf3db-c1f5-4f8f-9bc7-b812da1c897a\luxury_hero_bg_1788530540432.jpg"
        if os.path.exists(src_hero) and not os.path.exists(dest_hero):
            shutil.copyfile(src_hero, dest_hero)
    except Exception:
        pass

    db = SessionLocal()
    try:
        banners = db.query(Banner).filter(
            Banner.is_active == True
        ).order_by(asc(Banner.sort_order)).all()

        for b in banners:
            b.image_url = "images/hero_bg.jpg"
            if b.cta_secondary_text and "bridal" in b.cta_secondary_text.lower():
                b.cta_secondary_text = "Gold Collection"
                b.cta_secondary_url = "products.html?jewellery_type=Gold"
            if b.description and "bridal" in b.description.lower():
                b.description = b.description.replace("royal bridal jewellery", "fine heirloom jewellery").replace("bridal", "fine")
        try:
            db.commit()
        except Exception:
            db.rollback()

        banners_dict = []
        for b in banners:
            d = b.to_dict()
            d["image"] = "images/hero_bg.jpg"
            d["image_url"] = "images/hero_bg.jpg"
            banners_dict.append(d)

        return jsonify({
            "success": True,
            "banners": banners_dict
        })
    finally:
        db.close()
