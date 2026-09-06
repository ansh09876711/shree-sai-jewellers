from flask import Blueprint, request, jsonify
from sqlalchemy import or_, desc, asc
from ..database import SessionLocal
from ..models import Product, Category

products_bp = Blueprint("products", __name__, url_prefix="/api/products")

@products_bp.route("", methods=["GET"])
def get_products():
    db = SessionLocal()
    try:
        query = db.query(Product).filter(Product.is_active == True)

        # Category Filter
        category = request.args.get("category")
        if category and category.lower() != "all":
            query = query.join(Category).filter(
                or_(Category.name.ilike(f"%{category}%"), Product.category_name.ilike(f"%{category}%"))
            )

        # Jewellery Type (Gold, Diamond, Silver, Bridal)
        jewellery_type = request.args.get("jewellery_type")
        if jewellery_type:
            types = [t.strip() for t in jewellery_type.split(",")]
            query = query.filter(Product.jewellery_type.in_(types))

        # Metal Filter
        metal = request.args.get("metal")
        if metal:
            metals = [m.strip() for m in metal.split(",")]
            query = query.filter(Product.metal.in_(metals))

        # Purity Filter
        purity = request.args.get("purity")
        if purity:
            purities = [p.strip() for p in purity.split(",")]
            query = query.filter(Product.purity.in_(purities))

        # Price range
        min_price = request.args.get("min_price")
        if min_price:
            try:
                query = query.filter(Product.price >= float(min_price))
            except ValueError:
                pass

        max_price = request.args.get("max_price")
        if max_price:
            try:
                query = query.filter(Product.price <= float(max_price))
            except ValueError:
                pass

        # In Stock only
        in_stock = request.args.get("in_stock")
        if in_stock and in_stock.lower() in ["true", "1"]:
            query = query.filter(Product.stock > 0)

        # Flags: Bestseller / Trending / New Arrival
        if request.args.get("is_bestseller") in ["true", "1"]:
            query = query.filter(Product.is_bestseller == True)
        if request.args.get("is_trending") in ["true", "1"]:
            query = query.filter(Product.is_trending == True)
        if request.args.get("is_new_arrival") in ["true", "1"]:
            query = query.filter(Product.is_new_arrival == True)

        # Keyword search
        q = request.args.get("q")
        if q:
            query = query.filter(
                or_(
                    Product.name.ilike(f"%{q}%"),
                    Product.description.ilike(f"%{q}%"),
                    Product.sku.ilike(f"%{q}%"),
                    Product.metal.ilike(f"%{q}%"),
                    Product.purity.ilike(f"%{q}%")
                )
            )

        # Sorting
        sort = request.args.get("sort", "featured")
        if sort == "newest":
            query = query.order_by(desc(Product.created_at))
        elif sort == "price_asc":
            query = query.order_by(asc(Product.price))
        elif sort == "price_desc":
            query = query.order_by(desc(Product.price))
        elif sort == "discount":
            query = query.order_by(desc(Product.discount_percent))
        elif sort == "popular":
            query = query.order_by(desc(Product.is_bestseller), desc(Product.is_trending))
        else:
            query = query.order_by(desc(Product.is_bestseller), desc(Product.created_at))

        # Pagination
        total = query.count()
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 12))
        products = query.offset((page - 1) * limit).limit(limit).all()

        return jsonify({
            "success": True,
            "total": total,
            "page": page,
            "limit": limit,
            "products": [p.to_dict() for p in products]
        })
    finally:
        db.close()

@products_bp.route("/<product_id>", methods=["GET"])
def get_product(product_id):
    db = SessionLocal()
    try:
        product = db.query(Product).filter(
            or_(Product.id == product_id, Product.slug == product_id, Product.sku == product_id)
        ).first()

        if not product:
            return jsonify({"success": False, "message": "Product not found"}), 404

        return jsonify({
            "success": True,
            "product": product.to_dict()
        })
    finally:
        db.close()

@products_bp.route("/search", methods=["GET"])
def search_products():
    db = SessionLocal()
    try:
        q = request.args.get("q", "").strip()
        limit = int(request.args.get("limit", 10))

        if not q:
            return jsonify({"success": True, "products": []})

        products = db.query(Product).filter(
            Product.is_active == True,
            or_(
                Product.name.ilike(f"%{q}%"),
                Product.sku.ilike(f"%{q}%"),
                Product.metal.ilike(f"%{q}%"),
                Product.category_name.ilike(f"%{q}%")
            )
        ).limit(limit).all()

        return jsonify({
            "success": True,
            "products": [p.to_dict() for p in products]
        })
    finally:
        db.close()

@products_bp.route("", methods=["POST"])
def create_product():
    import uuid
    import datetime
    db = SessionLocal()
    try:
        data = request.get_json() or {}
        name = (data.get("name") or "").strip()
        price = float(data.get("price") or 0)
        if not name or price <= 0:
            return jsonify({"success": False, "message": "Product name and price are required"}), 400

        product_id = "prod_" + str(uuid.uuid4())[:8]
        slug = name.lower().replace(" ", "-").replace("'", "").replace("&", "and")

        product = Product(
            id=product_id,
            name=name,
            slug=slug,
            sku=data.get("sku") or f"SSJ-{str(uuid.uuid4())[:6].upper()}",
            category_id=data.get("category_id") or "cat_rings",
            category_name=data.get("category_name") or "Rings",
            jewellery_type=data.get("jewellery_type") or "Gold",
            metal=data.get("metal") or "Gold",
            purity=data.get("purity") or "22KT",
            price=price,
            original_price=float(data.get("original_price") or price * 1.15),
            discount_percent=int(data.get("discount_percent") or 0),
            making_charges=float(data.get("making_charges") or 0),
            gst_percent=3.0,
            gross_weight=float(data.get("gross_weight") or 0),
            net_weight=float(data.get("net_weight") or 0),
            stone_weight=float(data.get("stone_weight") or 0),
            diamond_carat=float(data.get("diamond_carat") or 0),
            stock=int(data.get("stock") or 10),
            images=data.get("images") or ["https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80"],
            description=data.get("description") or "",
            is_active=True,
            is_bestseller=bool(data.get("is_bestseller")),
            is_trending=bool(data.get("is_trending")),
            is_new_arrival=bool(data.get("is_new_arrival", True)),
            created_at=datetime.datetime.utcnow()
        )
        db.add(product)
        db.commit()
        return jsonify({"success": True, "message": "Product created successfully!", "product": product.to_dict()}), 201
    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()

@products_bp.route("/<product_id>", methods=["PUT"])
def update_product(product_id):
    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return jsonify({"success": False, "message": "Product not found"}), 404

        data = request.get_json() or {}
        for field in ["name", "category_name", "jewellery_type", "metal", "purity", "description"]:
            if field in data:
                setattr(product, field, data[field])
        for num_field in ["price", "original_price", "discount_percent", "gross_weight", "net_weight", "stock"]:
            if num_field in data:
                setattr(product, num_field, data[num_field])
        for bool_field in ["is_bestseller", "is_trending", "is_new_arrival", "is_active"]:
            if bool_field in data:
                setattr(product, bool_field, bool(data[bool_field]))
        if "images" in data and isinstance(data["images"], list):
            product.images = data["images"]

        db.commit()
        return jsonify({"success": True, "message": "Product updated successfully!", "product": product.to_dict()})
    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()

@products_bp.route("/<product_id>", methods=["DELETE"])
def delete_product(product_id):
    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return jsonify({"success": False, "message": "Product not found"}), 404
        db.delete(product)
        db.commit()
        return jsonify({"success": True, "message": "Product deleted successfully!"})
    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()

