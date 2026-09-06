import razorpay
import hmac
import hashlib
from ..config import Config

client = None
if Config.RAZORPAY_KEY_ID and Config.RAZORPAY_KEY_SECRET:
    client = razorpay.Client(auth=(Config.RAZORPAY_KEY_ID, Config.RAZORPAY_KEY_SECRET))

def create_razorpay_order(amount_in_rupees, receipt_id, notes=None):
    """
    Creates an order on Razorpay.
    Amount in paise (1 INR = 100 paise).
    """
    if not client:
        return {
            "id": f"order_mock_{receipt_id}",
            "amount": int(amount_in_rupees * 100),
            "currency": "INR",
            "status": "created"
        }

    try:
        data = {
            "amount": int(amount_in_rupees * 100),
            "currency": "INR",
            "receipt": str(receipt_id),
            "payment_capture": 1,
            "notes": notes or {}
        }
        order = client.order.create(data=data)
        return order
    except Exception as e:
        print(f"[Razorpay] Error creating order: {e}")
        raise e

def verify_razorpay_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
    """
    Verifies the HMAC-SHA256 signature received after payment.
    """
    if not Config.RAZORPAY_KEY_SECRET:
        # Mock validation for local testing when keys are not set
        return True

    try:
        params_dict = {
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        }
        client.utility.verify_payment_signature(params_dict)
        return True
    except razorpay.errors.SignatureVerificationError:
        return False
    except Exception as e:
        print(f"[Razorpay] Signature error: {e}")
        return False
