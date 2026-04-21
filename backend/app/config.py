import os
from dotenv import load_dotenv


load_dotenv()

class Config:
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")

    DATABASE_URL = os.environ.get("DATABASE_URL")
    LOGIN_MAX_ATTEMPTS = int(os.environ.get("LOGIN_MAX_ATTEMPTS", "5"))
    LOGIN_LOCK_MINUTES = int(os.environ.get("LOGIN_LOCK_MINUTES", "15"))
    SESSION_TTL_MINUTES = int(os.environ.get("SESSION_TTL_MINUTES", str(60 * 24 * 7)))
    SESSION_INACTIVITY_TIMEOUT_MINUTES = int(
        os.environ.get("SESSION_INACTIVITY_TIMEOUT_MINUTES", "30")
    )