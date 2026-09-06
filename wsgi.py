"""
WSGI entry point for Railway / Render / Gunicorn deployment.
Imports the Flask app from the backend package.
"""
import sys
import os

# Ensure the project root is on sys.path
sys.path.insert(0, os.path.dirname(__file__))

from backend.app import app

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
