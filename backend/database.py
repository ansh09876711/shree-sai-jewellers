from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session
from .config import Config

import os

def _build_engine():
    url = Config.DATABASE_URL
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    sqlite_db_path = os.path.join(root_dir, "shree_sai_jewellers.db").replace("\\", "/")
    sqlite_url = f"sqlite:///{sqlite_db_path}"

    if url and (url.startswith("postgresql") or url.startswith("postgres")):
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)

        # Always use pg8000 (pure Python) — works on Render free tier
        # with both direct (5432) and pooler (6543) connections
        if url.startswith("postgresql://") and not url.startswith("postgresql+"):
            url = url.replace("postgresql://", "postgresql+pg8000://", 1)

        try:
            eng = create_engine(
                url,
                pool_pre_ping=True,
                pool_size=2,
                max_overflow=3,
                pool_timeout=5,
                pool_recycle=300,
                connect_args={"ssl_context": True}
            )
            # Verify that connection works
            with eng.connect() as test_conn:
                test_conn.execute(text("SELECT 1"))
            print("[Database] Successfully connected to remote PostgreSQL.")
            return eng
        except Exception as e:
            print(f"[Database Warning] Remote PostgreSQL unreachable ({e}). Falling back to local SQLite: {sqlite_url}")
            return create_engine(sqlite_url, connect_args={"check_same_thread": False})
    else:
        actual_url = url if url else sqlite_url
        return create_engine(actual_url, connect_args={"check_same_thread": False})

engine = _build_engine()

SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
