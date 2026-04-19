##DUMMY DATA ENQUANTO NÃO HOUVER UMA BASE DE DADOS
import pyotp
from auth.service import hash_password

users = [
    {
        "id": 1,
        "username": "admin",
        "password": hash_password("123"),
        "role": "admin", 
        "otp_secret": None, 
        "otp_enabled": False    
    }
]

def get_user_by_username(username):
    for user in users:
        if user["username"] == username:
            return user
    return None

def get_user_by_id(user_id):
    for user in users:
        if user["id"] == user_id:
            return user
    return None