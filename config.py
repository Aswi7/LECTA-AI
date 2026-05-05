import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """
    Centralized configuration management for the Multilingual Lecture Assistant.
    Loads variables from the environment and provides defaults where safe.
    """
    
    # Base Directory
    BASE_DIR = Path(__file__).resolve().parent

    # MongoDB Configuration
    MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/lecture_assistant")

    # Flask Configuration
    FLASK_SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "default-dev-key-change-in-production")
    
    # File Storage Configuration
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", str(BASE_DIR / "backend" / "uploads"))
    EXPORTS_FOLDER = os.getenv("EXPORTS_FOLDER", str(BASE_DIR / "exports"))

    # ML Model Configuration
    WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")

    @classmethod
    def validate_config(cls):
        """
        Validates that all critical configuration variables are present.
        Raises ValueError if any required settings are missing or invalid.
        """
        required_vars = {
            "MONGODB_URI": cls.MONGODB_URI,
            "FLASK_SECRET_KEY": cls.FLASK_SECRET_KEY,
            "UPLOAD_FOLDER": cls.UPLOAD_FOLDER,
            "EXPORTS_FOLDER": cls.EXPORTS_FOLDER
        }

        for name, value in required_vars.items():
            if not value or value.startswith("default-dev-key"):
                if name == "FLASK_SECRET_KEY":
                    # We allow the default in dev but warn/raise if we want to be strict
                    continue 
                raise ValueError(f"Missing required environment variable: {name}")

        # Ensure directories exist
        os.makedirs(cls.UPLOAD_FOLDER, exist_ok=True)
        os.makedirs(cls.EXPORTS_FOLDER, exist_ok=True)

# Export as a constant for easy import
CONFIG = Config
