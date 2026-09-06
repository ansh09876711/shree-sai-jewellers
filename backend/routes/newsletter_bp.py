from flask import Blueprint, request, jsonify
from ..database import SessionLocal
from ..models import Subscriber

newsletter_bp = Blueprint("newsletter", __name__, url_prefix="/api/newsletter")

@newsletter_bp.route("", methods=["POST"])
def subscribe():
    db = SessionLocal()
    try:
        data = request.get_json() or {}
        email = data.get("email", "").strip().lower()

        if not email or "@" not in email:
            return jsonify({"success": False, "message": "Please enter a valid email address"}), 400

        existing = db.query(Subscriber).filter(Subscriber.email == email).first()
        if existing:
            return jsonify({"success": True, "message": "You are already subscribed!"}), 200

        subscriber = Subscriber(email=email)
        db.add(subscriber)
        db.commit()

        return jsonify({
            "success": True,
            "message": "Thank you for subscribing to Shree Sai Jewellers VIP updates!"
        }), 201
    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()
