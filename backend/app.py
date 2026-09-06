import os
from flask import Flask, jsonify
from flask_cors import CORS
from .config import Config
from .database import engine, Base

# Import all route blueprints
from .routes.products_bp import products_bp
from .routes.categories_bp import categories_bp
from .routes.banners_bp import banners_bp
from .routes.offers_bp import offers_bp
from .routes.rates_bp import rates_bp
from .routes.reviews_bp import reviews_bp
from .routes.orders_bp import orders_bp
from .routes.payments_bp import payments_bp
from .routes.coupons_bp import coupons_bp
from .routes.contact_bp import contact_bp
from .routes.newsletter_bp import newsletter_bp
from .routes.store_bp import store_bp
from .routes.auth_bp import auth_bp
from .routes.admin_bp import admin_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize CORS
    CORS(app, origins=Config.CORS_ORIGINS, supports_credentials=True)

    # Initialize tables if not existing
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as db_err:
        print(f"[Database Initialization Warning] {db_err}")

    # Register Blueprints
    app.register_blueprint(products_bp)
    app.register_blueprint(categories_bp)
    app.register_blueprint(banners_bp)
    app.register_blueprint(offers_bp)
    app.register_blueprint(rates_bp)
    app.register_blueprint(reviews_bp)
    app.register_blueprint(orders_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(coupons_bp)
    app.register_blueprint(contact_bp)
    app.register_blueprint(newsletter_bp)
    app.register_blueprint(store_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)

    # Set session secret key
    app.secret_key = Config.SECRET_KEY
    from datetime import timedelta
    app.permanent_session_lifetime = timedelta(days=30)

    # Root directory for static frontend files
    ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    from flask import send_from_directory

    @app.route("/")
    def index():
        return send_from_directory(ROOT_DIR, "index.html")

    @app.route("/api")
    def api_health():
        return jsonify({
            "status": "healthy",
            "service": "Shree Sai Jewellers REST API",
            "version": "2.0.0",
            "docs": "/api/products, /api/categories, /api/banners, /api/rates, /api/offers, /api/auth"
        })

    @app.route("/<path:path>")
    def serve_static(path):
        if os.path.exists(os.path.join(ROOT_DIR, path)):
            return send_from_directory(ROOT_DIR, path)
        return jsonify({"success": False, "message": "Resource not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"success": False, "message": "Internal server error"}), 500

    return app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_DEBUG", "True").lower() == "true")
