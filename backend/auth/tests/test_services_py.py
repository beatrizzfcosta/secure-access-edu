import pytest
from services import auth_service, totp_service
import pyotp

def test_register_login_refresh_totp_flow():
    username = 'leticia'
    password = 'S3cureP@ssw0rd!'

    reg = auth_service.register_user(username=username, password=password, enable_mfa=True)
    assert 'id' in reg and reg['username'] == username

    stored = auth_service.get_user_by_username(username)
    assert stored is not None
    assert stored.get('otp_enabled') is True
    assert 'otp_secret' in stored and 'otpauth_url' in stored

    token_now = pyotp.totp.TOTP(stored['otp_secret']).now()
    login_res = auth_service.login_user(username=username, password=password, otp_code=token_now)
    assert 'access_token' in login_res and 'refresh_token' in login_res

    refresh_res = auth_service.refresh_tokens(login_res['refresh_token'])
    assert 'access_token' in refresh_res and 'refresh_token' in refresh_res
    assert refresh_res['refresh_token'] != login_res['refresh_token']

    # verify TOTP
    secret = stored['otp_secret']
    token = pyotp.totp.TOTP(secret).now()
    ok = totp_service.verify_token(token, secret)
    assert ok is True
