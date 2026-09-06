import base64
import requests
from ..config import Config

def upload_to_imagekit(file_bytes_or_url, file_name, folder="/shree_sai_jewellers"):
    """
    Uploads an image to ImageKit.io and returns the optimized CDN URL.
    Works directly via ImageKit REST API with zero external dependencies.
    """
    if not Config.IMAGEKIT_PRIVATE_KEY or not Config.IMAGEKIT_URL_ENDPOINT:
        print("[ImageKit] ImageKit not configured.")
        return None

    try:
        url = "https://upload.imagekit.io/api/v1/files/upload"
        
        # Prepare basic auth with private key
        auth_str = f"{Config.IMAGEKIT_PRIVATE_KEY}:"
        auth_header = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")

        headers = {
            "Authorization": f"Basic {auth_header}"
        }

        data = {
            "fileName": file_name,
            "folder": folder,
            "useUniqueFileName": "true",
            "isPrivateFile": "false"
        }

        if isinstance(file_bytes_or_url, str) and (file_bytes_or_url.startswith("http://") or file_bytes_or_url.startswith("https://")):
            data["file"] = file_bytes_or_url
            files = None
        else:
            files = {"file": file_bytes_or_url}

        response = requests.post(url, headers=headers, data=data, files=files, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            return result.get("url")
        else:
            print(f"[ImageKit] Upload failed HTTP {response.status_code}: {response.text}")
            return None
    except Exception as e:
        print(f"[ImageKit] Error: {e}")
        return None
