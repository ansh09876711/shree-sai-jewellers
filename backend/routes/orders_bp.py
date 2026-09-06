import uuid
import datetime
from flask import Blueprint, request, jsonify
from ..database import SessionLocal
from ..models import Order, OrderItem, Product
from ..services.resend_service import send_order_confirmation_email

orders_bp = Blueprint("orders", __name__, url_prefix="/api/orders")

@orders_bp.route("", methods=["POST"])
def create_order():
    db = SessionLocal()
    try:
        data = request.get_json() or {}
        items_data = data.get("items", [])
        shipping_address = data.get("shipping_address", {})

        if not items_data:
            return jsonify({"success": False, "message": "Order must contain at least one item"}), 400

        if not shipping_address.get("name") or not shipping_address.get("mobile") or not shipping_address.get("address"):
            return jsonify({"success": False, "message": "Complete shipping information is required"}), 400

        order_id = f"SSJ-{datetime.datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        order = Order(
            id=order_id,
            guest_name=shipping_address.get("name"),
            guest_mobile=shipping_address.get("mobile"),
            guest_email=shipping_address.get("email"),
            shipping_address=shipping_address,
            coupon_code=data.get("coupon_code"),
            subtotal=data.get("subtotal", 0.0),
            discount=data.get("discount", 0.0),
            gst=data.get("gst", 0.0),
            shipping=data.get("shipping", 0.0),
            total=data.get("total", 0.0),
            status="pending",
            status_history={
                "pending": datetime.datetime.utcnow().isoformat()
            }
        )

        db.add(order)
        db.flush()

        # Add items and decrement inventory stock
        for item in items_data:
            prod_id = item.get("product_id") or item.get("id")
            product = db.query(Product).filter(Product.id == prod_id).first()
            prod_name = item.get("name") or (product.name if product else "Fine Jewellery")

            order_item = OrderItem(
                order_id=order.id,
                product_id=prod_id,
                product_name=prod_name,
                price=item.get("price", 0.0),
                quantity=item.get("quantity", 1),
                size=item.get("size")
            )
            db.add(order_item)

            if product and product.stock >= item.get("quantity", 1):
                product.stock -= item.get("quantity", 1)

        db.commit()

        return jsonify({
            "success": True,
            "order_id": order.id,
            "id": order.id,
            "order": order.to_dict()
        }), 201
    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()

@orders_bp.route("/<order_id>", methods=["GET"])
def get_order(order_id):
    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.id == order_id).first()

        if not order:
            return jsonify({"success": False, "message": "Order not found"}), 404

        return jsonify({
            "success": True,
            "order": order.to_dict()
        })
    finally:
        db.close()
