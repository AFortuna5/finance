# Gera public/logo-email.png — masthead 1160x280 (exibido ~580px no e-mail).
# Mesma identidade do og-card: papel creme, masthead serifado Georgia, selo m verde.
# Uso: python scripts/make-logo.py
from PIL import Image, ImageDraw, ImageFont

W, H = 1160, 280
PAPER = "#f2efe7"
INK = "#1c1a16"
GREEN = "#194c3c"
MUTED = "#6d675c"

FONTS = "C:/Windows/Fonts/"
font = lambda name, size: ImageFont.truetype(FONTS + name, size)

img = Image.new("RGB", (W, H), PAPER)
d = ImageDraw.Draw(img)

# Réguas duplas do masthead
d.line([(24, 28), (W - 24, 28)], fill=INK, width=3)
d.line([(24, 40), (W - 24, 40)], fill=INK, width=1)
d.line([(24, H - 40), (W - 24, H - 40)], fill=INK, width=1)
d.line([(24, H - 28), (W - 24, H - 28)], fill=INK, width=3)

# Selo m verde — quadrado com a letra
sx, sy, ss = 36, 78, 116
d.rectangle([sx, sy, sx + ss, sy + ss], fill=GREEN)
mf = font("georgiab.ttf", 84)
mw = d.textlength("m", font=mf)
d.text((sx + (ss - mw) / 2, sy - 2), "m", font=mf, fill=PAPER)

# Masthead
tf = font("georgiab.ttf", 108)
tx = sx + ss + 32
d.text((tx, 64), "meridiano", font=tf, fill=INK)

# Data da edição à direita, discreta (espaço reservado — o e-mail mostra a data no título)
tf2 = font("georgia.ttf", 34)
sub = "EDIÇÃO DO DIA"
sw = sum(d.textlength(c, font=tf2) + 6 for c in sub) - 6
x = W - 36 - sw
for c in sub:
    d.text((x, 118), c, font=tf2, fill=MUTED)
    x += d.textlength(c, font=tf2) + 6

img.save("public/logo-email.png", optimize=True)
print("logo-email.png", img.size)
