import os
import cloudinary
import cloudinary.uploader
import cloudinary.api
from ..config import Config

if Config.CLOUDINARY_CLOUD_NAME and Config.CLOUDINARY_API_KEY:
    cloudinary.config(
        cloud_name=Config.CLOUDINARY_CLOUD_NAME,
        api_key=Config.CLOUDINARY_API_KEY,
        api_secret=Config.CLOUDINARY_API_SECRET,
        secure=True
    )

def upload_image(file_to_upload, folder="shree_sai_jewellers"):
    """
    Upload an image to Cloudinary and return the secure CDN URL.
    """
    if not Config.CLOUDINARY_CLOUD_NAME:
        print("[Cloudinary] Cloudinary not configured.")
        return None

    try:
        response = cloudinary.uploader.upload(
            file_to_upload,
            folder=folder,
            transformation=[
                {"quality": "auto:best", "fetch_format": "auto"}
            ]
        )
        return response.get("secure_url")
    except Exception as e:
        print(f"[Cloudinary] Image upload error: {e}")
        return None
