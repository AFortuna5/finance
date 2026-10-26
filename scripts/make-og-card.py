# Gera public/og-image.png — card 1200x630 para og:image/twitter:card.
# Mantém a identidade do site: papel creme, tinta quente, verde institucional,
# masthead serifado em Georgia (fallback do Bodoni usado no CSS).
# Uso: python scripts/make-og-card.py
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
PAPER = "#f2efe7"
INK = "#1c1a16"
GREEN = "#194c3c"
ACCENT = "#bd4a31"
MUTED = "#6d675c"

FONTS = "C:/Windows/Fonts/"
font = lambda name, size: ImageFont.truetype(FONTS + name, size)

img = Image.new("RGB", (W, H), PAPER)
d = ImageDraw.Draw(img)

def text_w(draw, s, f, tracking=0):
    w = 0
    for ch in s:
        w += draw.textlength(ch, font=f) + tracking
    return w - tracking if s else 0

def draw_center(draw, s, y, f, fill, tracking=0):
    x = (W - text_w(draw, s, f, tracking)) / 2
    for ch in s:
        draw.text((x, y), ch, font=f, fill=fill)
        x += draw.textlength(ch, font=f) + tracking

# Réguas duplas do masthead
d.line([(60, 150), (W - 60, 150)], fill=INK, width=3)
d.line([(60, 160), (W - 60, 160)], fill=INK, width=1)

# Masthead
draw_center(d, "meridiano", 190, font("georgiab.ttf", 150), INK)

# Selo m verde — quadrado com a letra, como o favicon
mx, my, ms = (W / 2) + 380, 200, 84
d.rectangle([mx, my, mx + ms, my + ms], fill=GREEN)
mw = d.textlength("m", font=font("georgiab.ttf", 62))
d.text((mx + (ms - mw) / 2, my + 2), "m", font=font("georgiab.ttf", 62), fill=PAPER)

d.line([(60, 400), (W - 60, 400)], fill=INK, width=1)
d.line([(60, 410), (W - 60, 410)], fill=INK, width=3)

# Tagline espaçada
draw_center(d, "ECONOMIA EM PERSPECTIVA", 455, font("georgia.ttf", 34), GREEN, tracking=10)
draw_center(d, "UM JORNAL PARA ENTENDER, ANTES DE DECIDIR", 510, font("georgia.ttf", 26), MUTED, tracking=6)

# Filete de acento
d.line([(W / 2 - 60, 570), (W / 2 + 60, 570)], fill=ACCENT, width=4)

img.save("public/og-image.png", optimize=True)
print("og-image.png", img.size)
