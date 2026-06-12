# -*- coding: utf-8 -*-
"""QR keşif demosu için QR görseli üretir (qr-kesif-demo.bat çağırır).

Kullanım: py uret-kesif-qr.py <PC-LAN-IP>
Çıktı:   ../test-qr/qr-4-kesif-demo.png  (http://<IP>:8090/ içerir)
"""
import os
import sys

import qrcode
from PIL import Image, ImageDraw, ImageFont

ip = sys.argv[1] if len(sys.argv) > 1 else "localhost"
url = f"http://{ip}:8090/"
etiket = "4) KEŞİF DEMOSU — Köfteci Niyazi Usta"
hedef = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "test-qr")
os.makedirs(hedef, exist_ok=True)
dosya = os.path.join(hedef, "qr-4-kesif-demo.png")

qr = qrcode.QRCode(box_size=10, border=4)
qr.add_data(url)
qr.make()
img = qr.make_image().convert("RGB")
w, h = img.size
bar = 70
out = Image.new("RGB", (w, h + bar), "white")
out.paste(img, (0, 0))
d = ImageDraw.Draw(out)
boyut = 24
font = None
while boyut > 10:
    try:
        font = ImageFont.truetype("arial.ttf", boyut)
    except Exception:
        font = ImageFont.load_default()
        break
    bbox = d.textbbox((0, 0), etiket, font=font)
    if bbox[2] - bbox[0] <= w - 16:
        break
    boyut -= 2
bbox = d.textbbox((0, 0), etiket, font=font)
d.text(((w - (bbox[2] - bbox[0])) // 2, h + (bar - boyut) // 2 - 4), etiket, fill="black", font=font)
out.save(dosya)
print(f"QR üretildi: {dosya}  ->  {url}")
