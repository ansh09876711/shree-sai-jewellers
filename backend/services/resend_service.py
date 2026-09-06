import os
import resend
from ..config import Config

if Config.RESEND_API_KEY:
    resend.api_key = Config.RESEND_API_KEY

def send_order_confirmation_email(order_dict):
    """
    Sends a confirmation email to customer via Resend API upon order completion.
    """
    if not Config.RESEND_API_KEY:
        print("[Resend] Skipped email sending (RESEND_API_KEY not configured).")
        return False

    try:
        customer_email = order_dict.get("guest_email")
        order_id = order_dict.get("id")
        items_html = "".join([
            f"<tr><td style='padding:8px;border-bottom:1px solid #eee;'>{item.get('name')} (Size: {item.get('size') or 'Standard'})</td>"
            f"<td style='padding:8px;border-bottom:1px solid #eee;text-align:center;'>{item.get('quantity')}</td>"
            f"<td style='padding:8px;border-bottom:1px solid #eee;text-align:right;'>₹{item.get('price'):,.2f}</td></tr>"
            for item in order_dict.get("items", [])
        ])

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; background: #faf9f6; padding: 24px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #c5933a; margin-bottom: 4px; font-size: 24px;">Shree Sai Jewellers</h1>
                <p style="color: #666; font-size: 13px; margin-top: 0;">Fine Heirloom Jewellery · Est. 1984</p>
            </div>
            <div style="background: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #e8e3d9;">
                <h2 style="font-size: 18px; color: #222; margin-top: 0;">Order Confirmation #{order_id}</h2>
                <p>Dear {order_dict.get('guest_name')},</p>
                <p>Thank you for choosing Shree Sai Jewellers. Your order has been confirmed and is being processed with insured vault packaging.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                    <thead>
                        <tr style="background: #f5f0e6; color: #555;">
                            <th style="padding: 8px; text-align: left;">Item</th>
                            <th style="padding: 8px; text-align: center;">Qty</th>
                            <th style="padding: 8px; text-align: right;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                    </tbody>
                </table>

                <div style="text-align: right; margin-top: 16px; font-size: 15px;">
                    <p style="margin: 4px 0;"><strong>Total Paid: ₹{order_dict.get('total'):,.2f}</strong></p>
                </div>

                <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; font-size: 13px; color: #666;">
                    <p style="margin: 4px 0;"><strong>Delivery Address:</strong></p>
                    <p style="margin: 4px 0;">{order_dict.get('shipping_address', {}).get('address', '')}, {order_dict.get('shipping_address', {}).get('city', '')} - {order_dict.get('shipping_address', {}).get('pincode', '')}</p>
                    <p style="margin: 4px 0;">Phone: {order_dict.get('guest_mobile')}</p>
                </div>
            </div>
            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #888;">
                <p>Questions? Contact our concierge at <a href="mailto:{Config.ADMIN_EMAIL}" style="color:#c5933a;">{Config.ADMIN_EMAIL}</a> or call +91 98765 43210</p>
            </div>
        </div>
        """

        params = {
            "from": f"Shree Sai Jewellers <{Config.MAIL_SENDER}>",
            "to": [customer_email],
            "subject": f"Order Confirmed #{order_id} — Shree Sai Jewellers",
            "html": html_content
        }
        res = resend.Emails.send(params)
        print(f"[Resend] Order confirmation email sent to {customer_email}: {res}")
        return True
    except Exception as e:
        print(f"[Resend] Failed to send order email: {e}")
        return False

def send_contact_inquiry_email(contact_data):
    """
    Sends an admin alert email when a customer submits a contact / concierge form.
    """
    if not Config.RESEND_API_KEY:
        return False

    try:
        html_content = f"""
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #faf9f6;">
            <h2>New Concierge Inquiry Received</h2>
            <p><strong>Name:</strong> {contact_data.get('name')}</p>
            <p><strong>Phone:</strong> {contact_data.get('phone')}</p>
            <p><strong>Email:</strong> {contact_data.get('email')}</p>
            <p><strong>Subject:</strong> {contact_data.get('subject')}</p>
            <p><strong>Message:</strong></p>
            <blockquote style="background:#fff; padding:15px; border-left: 3px solid #c5933a;">{contact_data.get('message')}</blockquote>
        </div>
        """
        params = {
            "from": f"Shree Sai Concierge <{Config.MAIL_SENDER}>",
            "to": [Config.ADMIN_EMAIL],
            "subject": f"New Inquiry: {contact_data.get('subject', 'General')} from {contact_data.get('name')}",
            "html": html_content
        }
        resend.Emails.send(params)
        return True
    except Exception as e:
        print(f"[Resend] Failed to send contact email: {e}")
        return False


def send_password_reset_email(user_name: str, user_email: str, reset_url: str) -> bool:
    """
    Sends a password reset link to the user via Resend API.
    """
    if not Config.RESEND_API_KEY:
        print(f"[Resend] Skipped password reset email (RESEND_API_KEY not configured). Reset URL: {reset_url}")
        return False

    try:
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #faf9f6; padding: 32px; border-radius: 12px; color: #1a1a1a;">
            <div style="text-align: center; margin-bottom: 28px;">
                <h1 style="color: #c5933a; margin-bottom: 4px; font-size: 22px;">Shree Sai Jewellers</h1>
                <p style="color: #888; font-size: 12px; margin: 0;">Fine Heirloom Jewellery · Est. 1984</p>
            </div>
            <div style="background: #ffffff; padding: 28px; border-radius: 8px; border: 1px solid #e8e3d9;">
                <h2 style="font-size: 18px; color: #222; margin-top: 0;">Password Reset Request</h2>
                <p>Namaste {user_name},</p>
                <p>Aapne apna password reset karne ki request ki hai. Neeche diye button par click karein — yeh link <strong>1 ghante</strong> tak valid hai.</p>
                <div style="text-align: center; margin: 28px 0;">
                    <a href="{reset_url}"
                       style="display:inline-block; padding: 12px 32px; background: linear-gradient(135deg, #e2b755, #c5933a); color: #1a0a00; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; letter-spacing: 0.03em;">
                        🔑 Reset My Password
                    </a>
                </div>
                <p style="font-size: 13px; color: #666;">Agar button kaam na kare toh yeh link copy karein:</p>
                <p style="font-size: 12px; word-break: break-all; color: #c5933a;">{reset_url}</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #999;">Agar aapne yeh request nahi ki hai toh is email ko ignore kar dein. Aapka account safe hai.</p>
            </div>
            <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #bbb;">
                <p>© 2026 Shree Sai Jewellers · Indore, M.P.</p>
            </div>
        </div>
        """
        params = {
            "from": f"Shree Sai Jewellers <{Config.MAIL_SENDER}>",
            "to": [user_email],
            "subject": "Password Reset — Shree Sai Jewellers",
            "html": html_content
        }
        res = resend.Emails.send(params)
        print(f"[Resend] Password reset email sent to {user_email}: {res}")
        return True
    except Exception as e:
        print(f"[Resend] Failed to send reset email: {e}")
        return False
