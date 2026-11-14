import os
import sys

# Determine the absolute paths to the project root and backend directory
API_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(API_DIR)
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

# Ensure the backend directory is in sys.path
for directory in [BACKEND_DIR, ROOT_DIR, API_DIR]:
    if os.path.exists(directory) and directory not in sys.path:
        sys.path.insert(0, directory)

# Import the FastAPI application from backend/main.py
from main import app
