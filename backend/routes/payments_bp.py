import datetime
from flask import Blueprint, request, jsonify
from ..database import SessionLocal
from ..models import Order
from ..services.razorpay_service import create_razorpay_order, verify_razorpay_signature
from ..services.resend_service import send_order_confirmation_email

payments_bp = Blueprint("payments", __name__, url_prefix="/api/payments")

@payments_bp.route("/create", methods=["POST"])
def create_payment():
    db = SessionLocal()
    try:
        data = request.get_json() or {}
        order_id = data.get("order_id")
        amount = data.get("amount")

        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            return jsonify({"success": False, "message": "Order not found"}), 404

        payable_amount = float(amount or order.total)

        # Create Razorpay Order
        rzp_order = create_razorpay_order(payable_amount, order_id)

        order.razorpay_order_id = rzp_order.get("id")
        db.commit()

        return jsonify({
            "success": True,
            "order_id": order_id,
            "razorpay_order_id": rzp_order.get("id"),
            "amount": int(payable_amount * 100),
            "currency": "INR"
        })
    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()

@payments_bp.route("/verify", methods=["POST"])
def verify_payment():
    db = SessionLocal()
    try:
        data = request.get_json() or {}
        razorpay_order_id = data.get("razorpay_order_id")
        razorpay_payment_id = data.get("razorpay_payment_id")
        razorpay_signature = data.get("razorpay_signature")
        order_id = data.get("order_id")

        if not razorpay_payment_id:
            return jsonify({"success": False, "message": "Payment ID is required"}), 400

        # Verify signature
        is_valid = verify_razorpay_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature)

        if not is_valid:
            return jsonify({"success": False, "message": "Invalid payment signature"}), 400

        # Update order status in Supabase database
        order = db.query(Order).filter(Order.id == order_id).first()
        if order:
            order.status = "confirmed"
            order.razorpay_payment_id = razorpay_payment_id
            order.status_history = {
                **(order.status_history or {}),
                "confirmed": datetime.datetime.utcnow().isoformat()
            }
            db.commit()

            # Trigger transactional confirmation email via Resend
            try:
                send_order_confirmation_email(order.to_dict())
            except Exception as mail_err:
                print(f"[Email Error] {mail_err}")

        return jsonify({
            "success": True,
            "status": "verified",
            "message": "Payment verified successfully",
            "payment_id": razorpay_payment_id
        })
    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()
