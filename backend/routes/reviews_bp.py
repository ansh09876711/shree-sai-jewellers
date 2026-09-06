import uuid
from flask import Blueprint, request, jsonify
from sqlalchemy import desc
from ..database import SessionLocal
from ..models import Review

reviews_bp = Blueprint("reviews", __name__, url_prefix="/api/reviews")

@reviews_bp.route("", methods=["GET"])
def get_reviews():
    db = SessionLocal()
    try:
        query = db.query(Review).filter(Review.approved == True)

        product_id = request.args.get("product_id")
        if product_id:
            query = query.filter(Review.product_id == product_id)

        limit = int(request.args.get("limit", 10))
        reviews = query.order_by(desc(Review.created_at)).limit(limit).all()

        return jsonify({
            "success": True,
            "reviews": [r.to_dict() for r in reviews]
        })
    finally:
        db.close()

@reviews_bp.route("", methods=["POST"])
def submit_review():
    db = SessionLocal()
    try:
        data = request.get_json() or {}

        if not data.get("reviewer_name") or not data.get("text") or not data.get("rating"):
            return jsonify({"success": False, "message": "Name, rating and review text are required"}), 400

        review = Review(
            id=f"rev_{uuid.uuid4().hex[:12]}",
            product_id=data.get("product_id"),
            reviewer_name=data.get("reviewer_name"),
            email=data.get("email"),
            rating=int(data.get("rating", 5)),
            text=data.get("text"),
            verified_purchase=bool(data.get("order_id")),
            approved=True  # Auto-approve for demo, or set to False for moderation
        )

        db.add(review)
        db.commit()

        return jsonify({
            "success": True,
            "message": "Review submitted successfully",
            "review": review.to_dict()
        }), 201
    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()
