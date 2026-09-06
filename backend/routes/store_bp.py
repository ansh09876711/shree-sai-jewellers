from flask import Blueprint, jsonify
from ..database import SessionLocal
from ..models import StoreInfo

store_bp = Blueprint("store", __name__, url_prefix="/api/store-info")

@store_bp.route("", methods=["GET"])
def get_store_info():
    db = SessionLocal()
    try:
        store = db.query(StoreInfo).first()
        if not store:
            return jsonify({
                "success": True,
                "store": {
                    "name": "Shree Sai Jewellers",
                    "tagline": "Fine Heirloom Jewellery · Est. 1984",
                    "address": "Shree Sai Jewellers, Main Market, Indore, Madhya Pradesh - 452009",
                    "phone": "+91 98765 43210",
                    "email": "care@shreesaijewellers.com",
                    "hours": "Mon–Sat: 10:00 AM – 8:00 PM  |  Sun: 11:00 AM – 6:00 PM",
                    "store_hours": "Mon–Sat: 10:00 AM – 8:00 PM  |  Sun: 11:00 AM – 6:00 PM",
                    "maps_url": "https://maps.app.goo.gl/JpumezhtKE9LDbo37"
                }
            })

        return jsonify({
            "success": True,
            "store": store.to_dict()
        })
    finally:
        db.close()
