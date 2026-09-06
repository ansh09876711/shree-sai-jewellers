import os
from dotenv import load_dotenv

# Load .env file from workspace root or backend directory
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "shree-sai-jewellers-secret-key-2026")
    
    # Supabase PostgreSQL Database URL
    _db_url = os.getenv("DATABASE_URL", "")
    # Strip any whitespace/newlines that may be introduced by hosting env vars
    _db_url = _db_url.strip().replace("\n", "").replace("\r", "")
    DATABASE_URL = _db_url if _db_url else "sqlite:///shree_sai_jewellers.db"
    
    # Handle postgres:// and postgresql:// drivers (psycopg2 vs pg8000)
    if DATABASE_URL:
        if DATABASE_URL.startswith("postgres://"):
            DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
        
        # If psycopg2 is not installed, use pure-python pg8000 driver
        if DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+"):
            try:
                import psycopg2
            except ImportError:
                DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)

    # Razorpay Credentials
    RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_placeholder")
    RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "rzp_secret_placeholder")

    # Cloudinary & ImageKit Media CDN Credentials
    CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "")
    CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")

    IMAGEKIT_PUBLIC_KEY = os.getenv("IMAGEKIT_PUBLIC_KEY", "")
    IMAGEKIT_PRIVATE_KEY = os.getenv("IMAGEKIT_PRIVATE_KEY", "")
    IMAGEKIT_URL_ENDPOINT = os.getenv("IMAGEKIT_URL_ENDPOINT", "")

    # Resend Email Service
    RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
    MAIL_SENDER = os.getenv("MAIL_SENDER", "orders@shreesaijewellers.com")
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "care@shreesaijewellers.com")

    # CORS
    CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",")]
