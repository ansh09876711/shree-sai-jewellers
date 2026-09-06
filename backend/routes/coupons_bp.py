from flask import Blueprint, request, jsonify
from ..database import SessionLocal
from ..models import Coupon

coupons_bp = Blueprint("coupons", __name__, url_prefix="/api/coupons")

@coupons_bp.route("/validate", methods=["POST"])
def validate_coupon():
    db = SessionLocal()
    try:
        data = request.get_json() or {}
        code = data.get("code", "").strip().upper()
        order_amount = float(data.get("order_amount", 0.0))

        if not code:
            return jsonify({"success": False, "message": "Coupon code is required"}), 400

        coupon = db.query(Coupon).filter(Coupon.code == code, Coupon.is_active == True).first()

        if not coupon:
            return jsonify({"success": False, "message": "Invalid or expired coupon code"}), 404

        if coupon.min_order and order_amount < float(coupon.min_order):
            return jsonify({
                "success": False,
                "message": f"Minimum order of ₹{float(coupon.min_order):,.0f} required for this coupon"
            }), 400

        # Calculate discount amount
        discount_amount = 0.0
        if coupon.flat_discount and float(coupon.flat_discount) > 0:
            discount_amount = float(coupon.flat_discount)
        elif coupon.discount_percent and coupon.discount_percent > 0:
            discount_amount = order_amount * (coupon.discount_percent / 100.0)
            if coupon.max_discount and discount_amount > float(coupon.max_discount):
                discount_amount = float(coupon.max_discount)

        return jsonify({
            "success": True,
            "message": "Coupon applied successfully",
            "coupon": {
                **coupon.to_dict(),
                "discount_amount": discount_amount
            }
        })
    finally:
        db.close()
