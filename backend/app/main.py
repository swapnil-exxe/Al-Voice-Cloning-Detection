import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database.connection import get_db, Base, engine
from .database.init_db import init_db
from .api import auth, sessions, telephony
from .websocket import live

app = FastAPI(
    title="VOICEGUARD API",
    description="Real-Time AI Voice Integrity & Impersonation Protection Backend",
    version="1.0.0"
)

# CORS configuration
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
origins = [
    FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_db_client():
    # Automatically initialize/migrate database and seed on start
    db = next(get_db())
    try:
        init_db(db)
    finally:
        db.close()

# Router bindings
app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(sessions.analytics_router)
app.include_router(sessions.speaker_router)
app.include_router(telephony.router)
app.include_router(live.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "VOICEGUARD",
        "description": "Real-Time AI Voice Integrity & Impersonation Protection"
    }
