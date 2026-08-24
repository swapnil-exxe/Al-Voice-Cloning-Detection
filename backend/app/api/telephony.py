from typing import Dict
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..database.models import User
from .auth import get_current_user

router = APIRouter(prefix="/api/telephony", tags=["telephony"])

class TelephonyConfig(BaseModel):
    provider: str # 'twilio', 'plivo', 'generic'
    webhook_url: str
    is_active: bool
    phone_number: str

@router.get("/status")
def get_telephony_status(current_user: User = Depends(get_current_user)):
    return {
        "status": "operational",
        "provider_adapters": ["TwilioAdapter", "MockTelephonyAdapter", "GenericTelephonyAdapter"],
        "twilio_configured": os_env_has_twilio(),
        "active_streams": 0
    }

@router.get("/docs")
def get_telephony_docs():
    return {
        "architecture_summary": "VOICEGUARD integrates with telephony carriers by consuming a WebSocket media stream. The carrier redirects call audio in real-time, streaming payload blocks (typically mu-law/PCM, 8kHz/16kHz mono) to VOICEGUARD's ingestion adapter.",
        "twilio_integration": {
            "description": "Twilio streams call audio using the <Connect><Stream> TwiML verb. Create a webhook endpoint that returns the TwiML and points to our WebSocket stream endpoint.",
            "sample_twiml": '<Response><Connect><Stream url="wss://voiceguard.sec/ws/telephony-stream" /></Connect></Response>',
            "payload_format": {
                "event": "media",
                "streamSid": "MZxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                "media": {
                    "payload": "base64_encoded_pcm_or_mulaw_samples",
                    "chunk": "1",
                    "timestamp": "423"
                }
            }
        },
        "webhook_endpoint": "/api/telephony/webhook",
        "websocket_endpoint": "/ws/telephony-stream"
    }

def os_env_has_twilio() -> bool:
    import os
    sid = os.getenv("TWILIO_ACCOUNT_SID")
    return sid is not None and len(sid) > 10 and not sid.startswith("ACXX")
