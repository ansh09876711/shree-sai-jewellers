import uuid
import datetime
import secrets
from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from ..database import SessionLocal
from ..models import User, PasswordResetToken

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


# ─────────────────────────────────────────
#  REGISTER
# ─────────────────────────────────────────
@auth_bp.route("/register", methods=["POST"])
def register():
    db = SessionLocal()
    try:
        data = request.get_json() or {}
        name  = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        phone = (data.get("phone") or "").strip()
        password = data.get("password") or ""

        # ── Validation ──────────────────────────────────────
        if not name:
            return jsonify({"success": False, "message": "Naam zaroori hai"}), 400
        if not email or "@" not in email:
            return jsonify({"success": False, "message": "Valid email address daalen"}), 400
        if len(password) < 6:
            return jsonify({"success": False, "message": "Password kam se kam 6 characters ka hona chahiye"}), 400

        # ── Check duplicate ──────────────────────────────────
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            return jsonify({"success": False, "message": "Yeh email pehle se registered hai. Please login karein."}), 409

        # ── Create user ──────────────────────────────────────
        user = User(
            id=str(uuid.uuid4()),
            name=name,
            email=email,
            phone=phone,
            password_hash=generate_password_hash(password),
            is_active=True,
            is_verified=False,
            created_at=datetime.datetime.utcnow(),
        )
        db.add(user)
        db.commit()

        # Store in session
        session["user_id"] = user.id
        session["user_email"] = user.email
        session["user_name"] = user.name
        session.permanent = True

        return jsonify({
            "success": True,
            "message": f"Swagat hai, {user.name}! Account ban gaya.",
            "user": user.to_dict()
        }), 201

    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()


# ─────────────────────────────────────────
#  LOGIN
# ─────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    db = SessionLocal()
    try:
        data  = request.get_json() or {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not email or not password:
            return jsonify({"success": False, "message": "Email aur password daalna zaroori hai"}), 400

        user = db.query(User).filter(User.email == email).first()

        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"success": False, "message": "Email ya password galat hai"}), 401

        if not user.is_active:
            return jsonify({"success": False, "message": "Account band kar diya gaya hai. Support se sampark karein."}), 403

        # Update last login
        user.last_login = datetime.datetime.utcnow()
        db.commit()

        # Store in session
        session["user_id"] = user.id
        session["user_email"] = user.email
        session["user_name"] = user.name
        session.permanent = True

        return jsonify({
            "success": True,
            "message": f"Khush aamdeed, {user.name}!",
            "user": user.to_dict()
        })

    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()


# ─────────────────────────────────────────
#  GOOGLE LOGIN / SYNC (Supabase Database)
# ─────────────────────────────────────────
@auth_bp.route("/google", methods=["POST"])
def google_auth():
    db = SessionLocal()
    try:
        data = request.get_json() or {}
        email = (data.get("email") or "").strip().lower()
        name = (data.get("name") or "Google User").strip()
        google_id = data.get("google_id") or data.get("id") or str(uuid.uuid4())

        if not email:
            return jsonify({"success": False, "message": "Email address zaroori hai"}), 400

        # Check if user exists in Supabase PostgreSQL
        user = db.query(User).filter(User.email == email).first()

        if not user:
            # Create new user in Supabase
            user = User(
                id=str(uuid.uuid4()),
                name=name,
                email=email,
                phone=data.get("phone", ""),
                password_hash=generate_password_hash(secrets.token_hex(16)),
                is_active=True,
                is_verified=True,
                created_at=datetime.datetime.utcnow(),
                last_login=datetime.datetime.utcnow()
            )
            db.add(user)
            db.commit()
        else:
            user.last_login = datetime.datetime.utcnow()
            if name and not user.name:
                user.name = name
            user.is_verified = True
            db.commit()

        # Save session
        session["user_id"] = user.id
        session["user_email"] = user.email
        session["user_name"] = user.name
        session.permanent = True

        return jsonify({
            "success": True,
            "message": f"Namaste, {user.name}! Google se connect ho gaye.",
            "user": user.to_dict()
        })

    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()



# ─────────────────────────────────────────
#  LOGOUT
# ─────────────────────────────────────────
@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logout ho gaye. Phir milenge!"})


# ─────────────────────────────────────────
#  CURRENT USER (me)
# ─────────────────────────────────────────
@auth_bp.route("/me", methods=["GET"])
def me():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"success": False, "message": "Login karein", "logged_in": False}), 401

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            session.clear()
            return jsonify({"success": False, "message": "User nahi mila", "logged_in": False}), 401

        return jsonify({
            "success": True,
            "logged_in": True,
            "user": user.to_dict()
        })
    finally:
        db.close()


# ─────────────────────────────────────────
#  UPDATE PROFILE
# ─────────────────────────────────────────
@auth_bp.route("/profile", methods=["PUT"])
def update_profile():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"success": False, "message": "Pehle login karein"}), 401

    db = SessionLocal()
    try:
        data = request.get_json() or {}
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return jsonify({"success": False, "message": "User nahi mila"}), 404

        if data.get("name"):
            user.name = data["name"].strip()
        if data.get("phone"):
            user.phone = data["phone"].strip()

        # Password change
        old_pw = data.get("old_password")
        new_pw = data.get("new_password")
        if old_pw and new_pw:
            if not check_password_hash(user.password_hash, old_pw):
                return jsonify({"success": False, "message": "Purana password galat hai"}), 400
            if len(new_pw) < 6:
                return jsonify({"success": False, "message": "Naya password 6+ characters ka hona chahiye"}), 400
            user.password_hash = generate_password_hash(new_pw)

        db.commit()
        session["user_name"] = user.name

        return jsonify({
            "success": True,
            "message": "Profile update ho gaya!",
            "user": user.to_dict()
        })
    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()


# ─────────────────────────────────────────
#  FORGOT PASSWORD — send reset link
# ─────────────────────────────────────────
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    db = SessionLocal()
    try:
        data  = request.get_json() or {}
        email = (data.get("email") or "").strip().lower()

        if not email:
            return jsonify({"success": False, "message": "Email address is required"}), 400

        user = db.query(User).filter(User.email == email).first()

        # Always return success to prevent email enumeration
        if not user or not user.is_active:
            return jsonify({"success": True, "message": "If this email is registered, a reset link has been sent."})

        # Invalidate any existing unused tokens
        existing_tokens = db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False
        ).all()
        for t in existing_tokens:
            t.used = True

        # Generate secure token (valid for 1 hour)
        token = secrets.token_urlsafe(48)
        expires = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires,
            used=False
        )
        db.add(reset_token)
        db.commit()

        # Send email via Resend
        try:
            from ..services.resend_service import send_password_reset_email
            from ..config import Config
            # Build reset URL — use request origin or configured frontend URL
            origin = request.headers.get("Origin") or request.host_url.rstrip("/")
            reset_url = f"{origin}/login.html?reset_token={token}"
            send_password_reset_email(user.name, user.email, reset_url)
        except Exception as e:
            print(f"[Auth] Reset email send failed: {e}")

        return jsonify({"success": True, "message": "A password reset link has been sent to your email. Please use it within 1 hour."})

    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()


# ─────────────────────────────────────────
#  RESET PASSWORD — set new password
# ─────────────────────────────────────────
@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    db = SessionLocal()
    try:
        data        = request.get_json() or {}
        token       = (data.get("token") or "").strip()
        new_password = data.get("password") or ""

        if not token:
            return jsonify({"success": False, "message": "Reset token is missing"}), 400
        if len(new_password) < 6:
            return jsonify({"success": False, "message": "Password must be at least 6 characters"}), 400

        reset_token = db.query(PasswordResetToken).filter(
            PasswordResetToken.token == token,
            PasswordResetToken.used == False
        ).first()

        if not reset_token:
            return jsonify({"success": False, "message": "Reset link is invalid or has already been used"}), 400

        if datetime.datetime.utcnow() > reset_token.expires_at.replace(tzinfo=None):
            reset_token.used = True
            db.commit()
            return jsonify({"success": False, "message": "Reset link has expired. Please request a new one."}), 400

        user = db.query(User).filter(User.id == reset_token.user_id).first()
        if not user or not user.is_active:
            return jsonify({"success": False, "message": "User not found"}), 404

        user.password_hash = generate_password_hash(new_password)
        reset_token.used = True
        db.commit()

        return jsonify({"success": True, "message": "Password updated successfully! You can now sign in with your new password."})

    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()
