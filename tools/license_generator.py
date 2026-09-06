#!/usr/bin/env python3
import argparse, base64, subprocess, tempfile, time, uuid
from pathlib import Path

def b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip('=')

def main():
    p = argparse.ArgumentParser(description='Genera licencias PARKOPS ligadas a usuario y dispositivo.')
    p.add_argument('--user', required=True)
    p.add_argument('--device', required=True, help='ANDROID_ID mostrado por la aplicación')
    p.add_argument('--plan', choices=['monthly','annual','lifetime'], default='annual')
    p.add_argument('--days', type=int, default=None)
    p.add_argument('--private-key', default='solvex_license_private.pem')
    args = p.parse_args()
    now = int(time.time())
    if args.plan == 'lifetime': exp = 0
    elif args.days is not None: exp = now + args.days * 86400
    elif args.plan == 'monthly': exp = now + 31 * 86400
    else: exp = now + 366 * 86400
    user = args.user.replace('|','-').strip()
    device = args.device.replace('|','-').strip()
    license_id = 'LIC-' + uuid.uuid4().hex[:12].upper()
    payload = f'SVX1|{license_id}|{user}|{device}|{args.plan}|{exp}'.encode()
    with tempfile.NamedTemporaryFile(delete=False) as pf, tempfile.NamedTemporaryFile(delete=False) as sf:
        pf.write(payload); pf.flush(); payload_path = pf.name; sig_path = sf.name
    try:
        subprocess.run(['openssl','dgst','-sha256','-sign',args.private_key,'-out',sig_path,payload_path], check=True)
        sig = Path(sig_path).read_bytes()
    finally:
        Path(payload_path).unlink(missing_ok=True); Path(sig_path).unlink(missing_ok=True)
    print(b64u(payload) + '.' + b64u(sig))

if __name__ == '__main__':
    main()
