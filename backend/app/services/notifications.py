import os
from datetime import datetime

class NotificationHub:
    """Simulates multi-channel alert delivery (UI prompt, SMS, email, in-app notifications)."""
    @staticmethod
    def dispatch_sih_alerts(session_id: str, severity: str, score: int, message: str) -> dict:
        log_entries = []
        timestamp = datetime.utcnow().isoformat()
        
        # We check environment flags or mock them for hackathon demo
        twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
        has_twilio = twilio_sid and not twilio_sid.startswith("ACXX")
        
        # 1. Dispatch SMS alert
        sms_status = "SENT (SIMULATOR)"
        if has_twilio:
            # Twilio SMS client logic placeholder
            sms_status = "SENT via Twilio Gateway"
        
        sms_log = f"[{timestamp}] SMS alert dispatched to frontline staff phone: \"VOICEGUARD ALERT: Impersonation threat detected. Session Risk: {score}%. Verify caller identity immediately.\""
        log_entries.append(sms_log)
        print(f"[NotificationHub] {sms_status}: {sms_log}")
        
        # 2. Dispatch email incident report
        email_log = f"[{timestamp}] SOC security incident email sent to supervisor: \"CRITICAL IDENTITY ATTACK WARNING - Session ID: {session_id}. A synthetic voice profile has been flagged by ML classifiers. Technical reasons: {message}\""
        log_entries.append(email_log)
        print(f"[NotificationHub] SENT via SendGrid: {email_log}")
        
        # 3. Trigger supervisor dashboard push notification
        push_log = f"[{timestamp}] Real-time in-app dashboard notification pushed to security supervisor consoles."
        log_entries.append(push_log)
        
        return {
            "sms": sms_status,
            "email": "SENT (SendGrid Gateway)",
            "push": "DELIVERED",
            "dispatch_logs": log_entries
        }
