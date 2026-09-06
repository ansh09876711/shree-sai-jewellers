from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session
from .config import Config

def _build_engine():
    url = Config.DATABASE_URL

    if url.startswith("postgresql") or url.startswith("postgres"):
        # Ensure correct driver prefix
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)

        # For Supabase Transaction Pooler (port 6543), force pg8000 driver
        # psycopg2 has issues with pgbouncer/transaction pooler
        is_pooler = ":6543/" in url
        if is_pooler:
            if "postgresql://" in url and "postgresql+" not in url:
                url = url.replace("postgresql://", "postgresql+pg8000://", 1)
            return create_engine(
                url,
                pool_pre_ping=True,
                pool_size=3,
                max_overflow=5,
                pool_timeout=30,
                pool_recycle=300,
                connect_args={"ssl_context": True}
            )

        # Direct connection (port 5432) — use psycopg2 with SSL
        if url.startswith("postgresql://") and not url.startswith("postgresql+"):
            try:
                import psycopg2
            except ImportError:
                url = url.replace("postgresql://", "postgresql+pg8000://", 1)

        return create_engine(
            url,
            pool_pre_ping=True,
            pool_size=3,
            max_overflow=5,
            pool_timeout=30,
            pool_recycle=300,
            connect_args={"sslmode": "require", "connect_timeout": 10}
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
