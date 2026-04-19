import os
import google.generativeai as genai
from twilio.rest import Client
from dotenv import load_dotenv

# Load secret keys from .env file
load_dotenv()

# --- Config & Keys ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
TARGET_PHONE_NUMBER = os.getenv("TARGET_PHONE_NUMBER")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def dispatch_emergency(water_levels):
    """
    1. Uses Gemini AI to draft an intelligent, situation-aware emergency alert.
    2. Uses Twilio to autonomously dispatch the SMS alert.
    """
    print("\n[!] [AI AGENT] Emergency Protocol Activated [!]")
    
    # 1. Ask Gemini to write an emergency alert
    sms_text = ""
    try:
        print("[*] [AI AGENT] Consulting Gemini AI for optimal alert message...")
        model = genai.GenerativeModel('gemini-1.5-pro')
        prompt = f"""
        You are the 'TsunamiShield AI Emergency Dispatcher' for Chennai, India.
        Our machine learning sensors just detected a sudden massive drop in sea level followed by a rapid rise, which is a textbook tsunami indicator.
        Recent water level telemetry (meters): {water_levels[-5:]}
        
        Write a critical, highly urgent, very concise (DO NOT EXCEED 2 SENTENCES) SMS text alert. 
        It MUST include the instruction to evacuate coastal Chennai immediately to high ground or safe shelters.
        No hashtags, no pleasantries. Start with 'TSUNAMISHIELD ALERT:'.
        """
        response = model.generate_content(prompt)
        sms_text = response.text.strip()
        print(f"[*] [AI AGENT] Gemini Alert Drafted:\n> {sms_text}")
    except Exception as e:
        print(f"[!] [AI AGENT] Gemini AI error (fallback used): {e}")
        sms_text = "TSUNAMISHIELD ALERT: Critical tsunami anomaly detected! Evacuate coastal Chennai to designated top-floor safe shelters or high ground immediately!"

    # 2. Send SMS via Twilio
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TARGET_PHONE_NUMBER:
        try:
            print("[-] [AI AGENT] Connecting to Twilio satellite dispatch...")
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            message = client.messages.create(
                body=sms_text,
                from_=TWILIO_PHONE_NUMBER,
                to=TARGET_PHONE_NUMBER
            )
            print(f"[+] [AI AGENT] Twilio SMS dispatched successfully to {TARGET_PHONE_NUMBER}! Message SID: {message.sid}")
            return {"status": "dispatched", "message": sms_text, "sid": message.sid}
        except Exception as e:
            print(f"[-] [AI AGENT] Twilio dispatch error. Ensure credentials and verified numbers are correct. Details: {e}")
            return {"status": "failed", "message": sms_text, "error": str(e)}
    else:
        print("[-] [AI AGENT] Twilio credentials missing in .env. Skipping real SMS dispatch.")
        return {"status": "simulated", "message": sms_text}
