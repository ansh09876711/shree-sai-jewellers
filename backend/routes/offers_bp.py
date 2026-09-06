from flask import Blueprint, jsonify
from ..database import SessionLocal
from ..models import Offer

offers_bp = Blueprint("offers", __name__, url_prefix="/api/offers")

@offers_bp.route("", methods=["GET"])
def get_offers():
    db = SessionLocal()
    try:
        offers = db.query(Offer).filter(Offer.is_active == True).all()

        return jsonify({
            "success": True,
            "offers": [o.to_dict() for o in offers]
        })
    finally:
        db.close()
