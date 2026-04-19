import pyotp

def generate_secret(name: str, issuer: str) -> dict:
    secret = pyotp.random_base32()
    otpauth_url = pyotp.totp.TOTP(secret).provisioning_uri(name=name, issuer_name=issuer)
    return {'secret': secret, 'otpauth_url': otpauth_url}

def get_otpauth_url(secret: str, name: str, issuer: str) -> str:
    return pyotp.totp.TOTP(secret).provisioning_uri(name=name, issuer_name=issuer)

def verify_token(token: str, secret: str, window: int = 1) -> bool:
    return pyotp.TOTP(secret).verify(token, valid_window=window)
