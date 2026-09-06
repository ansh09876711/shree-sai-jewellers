from flask import Blueprint, jsonify
from ..database import SessionLocal
from ..models import Rate

rates_bp = Blueprint("rates", __name__, url_prefix="/api/rates")

@rates_bp.route("", methods=["GET"])
def get_rates():
    db = SessionLocal()
    try:
        rate = db.query(Rate).order_by(Rate.id.desc()).first()

        if not rate:
            return jsonify({
                "success": True,
                "rates": {
                    "gold_24k": 7480.00,
                    "gold_22k": 6890.00,
                    "silver_999": 91.50
                }
            })

        return jsonify({
            "success": True,
            "rates": rate.to_dict()
        })
    finally:
        db.close()

@rates_bp.route("", methods=["POST", "PUT"])
def update_rates():
    from flask import request
    import datetime
    db = SessionLocal()
    try:
        data = request.get_json() or {}
        rate = db.query(Rate).order_by(Rate.id.desc()).first()
        if not rate:
            rate = Rate(gold_24k=7480.0, gold_22k=6890.0, silver_999=91.5)
            db.add(rate)

        if "gold_24k" in data:
            rate.gold_24k = float(data["gold_24k"])
        if "gold_22k" in data:
            rate.gold_22k = float(data["gold_22k"])
        if "silver_999" in data:
            rate.silver_999 = float(data["silver_999"])
        rate.updated_at = datetime.datetime.utcnow()

        db.commit()
        return jsonify({
            "success": True,
            "message": "Live gold & silver rates updated successfully!",
            "rates": rate.to_dict()
        })
    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()
