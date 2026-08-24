import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Retrieve database connection string
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Local fallback to SQLite database file
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../voiceguard.db"))
    DATABASE_URL = f"sqlite:///{db_path}"
    print(f"[Database] DATABASE_URL not set. Falling back to local SQLite: {DATABASE_URL}")
else:
    print(f"[Database] Connecting to production database...")

# SQLAlchemy settings
# SQLite requires different thread checking parameters
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """FastAPI Dependency to obtain database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
