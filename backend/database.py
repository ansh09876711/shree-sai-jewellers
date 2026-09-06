from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session
from .config import Config

def _build_engine():
    url = Config.DATABASE_URL

    if url.startswith("postgresql") or url.startswith("postgres"):
        # Ensure correct driver prefix
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)

        # Use pg8000 if psycopg2 not available
        if url.startswith("postgresql://") and not url.startswith("postgresql+"):
            try:
                import psycopg2
            except ImportError:
                url = url.replace("postgresql://", "postgresql+pg8000://", 1)

        # Supabase Transaction Pooler — SSL in URL params, no connect_args
        # Pool settings conservative for free tier
        return create_engine(
            url + ("&sslmode=require" if "?" in url else "?sslmode=require"),
            pool_pre_ping=True,
            pool_size=3,
            max_overflow=5,
            pool_timeout=30,
            pool_recycle=300,
        )
    else:
        # SQLite fallback
        return create_engine(url, connect_args={"check_same_thread": False})

engine = _build_engine()

SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
