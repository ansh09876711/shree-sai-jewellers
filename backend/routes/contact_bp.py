from flask import Blueprint, request, jsonify
from ..database import SessionLocal
from ..models import Contact
from ..services.resend_service import send_contact_inquiry_email

contact_bp = Blueprint("contact", __name__, url_prefix="/api/contact")

@contact_bp.route("", methods=["POST"])
def submit_contact():
    db = SessionLocal()
    try:
        data = request.get_json() or {}
        name = data.get("name", "").strip()
        email = data.get("email", "").strip()
        phone = data.get("phone", "").strip()
        subject = data.get("subject", "General Inquiry").strip()
        message = data.get("message", "").strip()

        if not name or not email or not phone or not message:
            return jsonify({"success": False, "message": "Name, email, phone, and message are required"}), 400

        contact = Contact(
            name=name,
            email=email,
            phone=phone,
            subject=subject,
            message=message
        )
        db.add(contact)
        db.commit()

        # Send email alert via Resend
        try:
            send_contact_inquiry_email(data)
        except Exception as mail_err:
            print(f"[Contact Mail Error] {mail_err}")

        return jsonify({
            "success": True,
            "message": "Thank you! Your message has been sent to our concierge."
        }), 201
    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()
