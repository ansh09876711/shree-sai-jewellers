from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session
from .config import Config

def _build_engine():
    url = Config.DATABASE_URL

    if url.startswith("postgresql") or url.startswith("postgres"):
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)

        # Always use pg8000 (pure Python) — works on Render free tier
        # with both direct (5432) and pooler (6543) connections
        if url.startswith("postgresql://") and not url.startswith("postgresql+"):
            url = url.replace("postgresql://", "postgresql+pg8000://", 1)

        return create_engine(
            url,
            pool_pre_ping=True,
            pool_size=2,
            max_overflow=3,
            pool_timeout=30,
            pool_recycle=300,
            connect_args={"ssl_context": True}
        )
    else:
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
