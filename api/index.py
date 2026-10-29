"""
Vercel Serverless Entry Point for Shree Sai Jewellers Flask API
"""
import sys
import os

# Add the project root to path so we can import the backend package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app import app

# Vercel requires the variable to be named 'app'
# app is already imported above
