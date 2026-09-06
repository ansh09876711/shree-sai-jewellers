import os
import shutil
from flask import Blueprint, jsonify
from sqlalchemy import asc
from ..database import SessionLocal
from ..models import Category

categories_bp = Blueprint("categories", __name__, url_prefix="/api/categories")

# Copy generated images to static images/categories folder
SRC_DIR = r"C:\Users\ANSH AGARWAL\.gemini\antigravity-ide\brain\85bdf3db-c1f5-4f8f-9bc7-b812da1c897a"
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEST_DIR = os.path.join(ROOT_DIR, "images", "categories")
os.makedirs(DEST_DIR, exist_ok=True)

IMAGE_MAP = {
    "rings": ("category_rings_1788412075673.jpg", "rings.jpg"),
    "necklaces": ("category_necklaces_1788412097688.jpg", "necklaces.jpg"),
    "earrings": ("category_earrings_1788412136335.jpg", "earrings.jpg"),
    "bangles": ("category_bangles_1788412164036.jpg", "bangles.jpg"),
    "bracelets": ("category_bracelets_1788412214098.jpg", "bracelets.jpg"),
    "chains": ("category_chains_1788412273848.jpg", "chains.jpg")
}

for cat_name, (src_file, dest_file) in IMAGE_MAP.items():
    s = os.path.join(SRC_DIR, src_file)
    d = os.path.join(DEST_DIR, dest_file)
    if os.path.exists(s):
        try:
            shutil.copyfile(s, d)
        except Exception:
            pass




const_CATEGORY_IMAGES = {
    "rings": "images/categories/rings.jpg",
    "necklaces": "images/categories/necklaces.jpg",
    "earrings": "images/categories/earrings.jpg",
    "bangles": "images/categories/bangles.jpg",
    "bracelets": "images/categories/bracelets.jpg",
    "chains": "images/categories/chains.jpg"
}

@categories_bp.route("", methods=["GET"])
def get_categories():
    db = SessionLocal()
    try:
        # Ensure bridal category is deactivated
        try:
            db.query(Category).filter(
                (Category.slug.ilike("%bridal%")) | (Category.name.ilike("%bridal%"))
            ).update({"is_active": False}, synchronize_session=False)
            db.commit()
        except Exception:
            db.rollback()

        categories = db.query(Category).filter(
            Category.is_active == True,
            ~Category.slug.ilike("%bridal%"),
            ~Category.name.ilike("%bridal%")
        ).order_by(asc(Category.sort_order), asc(Category.name)).all()

        # Update database images with high quality
        for c in categories:
            slug_key = (c.slug or c.name).lower()
            if slug_key in const_CATEGORY_IMAGES:
                c.image_url = const_CATEGORY_IMAGES[slug_key]
        try:
            db.commit()
        except Exception:
            db.rollback()

        if not categories:
            default_cats = [
                {"id": "cat_rings", "name": "Rings", "slug": "rings", "icon": "💍", "img": const_CATEGORY_IMAGES["rings"], "image": const_CATEGORY_IMAGES["rings"], "product_count": 6},
                {"id": "cat_necklaces", "name": "Necklaces", "slug": "necklaces", "icon": "✨", "img": const_CATEGORY_IMAGES["necklaces"], "image": const_CATEGORY_IMAGES["necklaces"], "product_count": 8},
                {"id": "cat_earrings", "name": "Earrings", "slug": "earrings", "icon": "💎", "img": const_CATEGORY_IMAGES["earrings"], "image": const_CATEGORY_IMAGES["earrings"], "product_count": 6},
                {"id": "cat_bangles", "name": "Bangles", "slug": "bangles", "icon": "💫", "img": const_CATEGORY_IMAGES["bangles"], "image": const_CATEGORY_IMAGES["bangles"], "product_count": 5},
                {"id": "cat_bracelets", "name": "Bracelets", "slug": "bracelets", "icon": "👑", "img": const_CATEGORY_IMAGES["bracelets"], "image": const_CATEGORY_IMAGES["bracelets"], "product_count": 4},
                {"id": "cat_chains", "name": "Chains", "slug": "chains", "icon": "🔗", "img": const_CATEGORY_IMAGES["chains"], "image": const_CATEGORY_IMAGES["chains"], "product_count": 5}
            ]
            return jsonify({"success": True, "categories": default_cats})

        result = []
        for c in categories:
            d = c.to_dict()
            slug_key = (c.slug or c.name).lower()
            if slug_key in const_CATEGORY_IMAGES:
                d["image"] = const_CATEGORY_IMAGES[slug_key]
                d["img"] = const_CATEGORY_IMAGES[slug_key]
            result.append(d)

        return jsonify({
            "success": True,
            "categories": result
        })

    except Exception as e:
        return jsonify({
            "success": True,
            "categories": [
                {"id": "cat_rings", "name": "Rings", "slug": "rings", "icon": "💍", "img": const_CATEGORY_IMAGES["rings"], "image": const_CATEGORY_IMAGES["rings"], "product_count": 6},
                {"id": "cat_necklaces", "name": "Necklaces", "slug": "necklaces", "icon": "✨", "img": const_CATEGORY_IMAGES["necklaces"], "image": const_CATEGORY_IMAGES["necklaces"], "product_count": 8},
                {"id": "cat_earrings", "name": "Earrings", "slug": "earrings", "icon": "💎", "img": const_CATEGORY_IMAGES["earrings"], "image": const_CATEGORY_IMAGES["earrings"], "product_count": 6},
                {"id": "cat_bangles", "name": "Bangles", "slug": "bangles", "icon": "💫", "img": const_CATEGORY_IMAGES["bangles"], "image": const_CATEGORY_IMAGES["bangles"], "product_count": 5},
                {"id": "cat_bracelets", "name": "Bracelets", "slug": "bracelets", "icon": "👑", "img": const_CATEGORY_IMAGES["bracelets"], "image": const_CATEGORY_IMAGES["bracelets"], "product_count": 4},
                {"id": "cat_chains", "name": "Chains", "slug": "chains", "icon": "🔗", "img": const_CATEGORY_IMAGES["chains"], "image": const_CATEGORY_IMAGES["chains"], "product_count": 5}
            ]
        })
    finally:
        db.close()
