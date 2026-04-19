from service import hash_password, verify_password, verify_otp, authenticate_user, generate_access_token
from flask import Flask

def run_checks():
    print('1) Testing hash/verify')
    pw = 'TestP@ssw0rd'
    h = hash_password(pw)
    print('  hashed:', h[:30] + '...')
    assert verify_password(h, pw) is True
    assert verify_password(h, 'wrong') is False

    print('2) Testing OTP verification')
    #create a totp secret and check verify_otp uses pyotp correctly
    import pyotp
    secret = pyotp.random_base32()
    user = { 'id': 'u1', 'role': 'user', 'password': h, 'otp_enabled': True, 'otp_secret': secret }
    totp = pyotp.TOTP(secret)
    token = totp.now()
    ok = verify_otp(user, token)
    assert ok is True

    print('3) Testing authenticate_user')
    user_obj = { 'id': 'u1', 'username': 'u1', 'role': 'user', 'password': h }
    auth = authenticate_user(user_obj, pw)
    assert auth is not None
    auth_fail = authenticate_user(user_obj, 'bad')
    assert auth_fail is None

    print('4) Testing generate_token inside Flask app context')
    app = Flask('test')
    app.config['JWT_SECRET_KEY'] = 'dev-secret-for-test'
    with app.app_context():
        token = generate_access_token(user_obj)
        print('  token length:', len(token))

    print('All passed')

if __name__ == '__main__':
    run_checks()
