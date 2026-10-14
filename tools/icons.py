"""Ícones do app e tela de abertura (PWA / Play Store / Capacitor).

Monta tudo a partir da sprite do Firewall em cima de um fundo azul-escuro com
brilho no meio. Rodar da raiz do repo:  python tools/icons.py

Saídas em firewall-defense/assets/app/:
  icon-192.png, icon-512.png            ícone normal (cantos arredondados)
  icon-maskable-512.png                 ícone adaptável do Android: fundo cheio,
                                        desenho dentro da zona segura (círculo
                                        de 80% do lado), o sistema recorta
  apple-touch-icon.png (180)            iPhone/iPad
  icon-1024.png                         base pro @capacitor/assets (icon-only)
  icon-foreground-1024.png              camada da frente do ícone adaptável
  icon-background-1024.png              camada de trás do ícone adaptável
  splash-2732.png                       tela de abertura (Capacitor)
"""
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..', 'firewall-defense')
SPRITE = os.path.join(ROOT, 'assets', 'sprites', 'firewall.png')
OUT = os.path.join(ROOT, 'assets', 'app')

BG_IN = (44, 62, 120)   # brilho no meio
BG_OUT = (6, 10, 20)    # #060a14, igual ao background_color do manifest


def background(size):
    """Gradiente radial do azul do jogo pro quase preto."""
    small = 256
    im = Image.new('RGB', (small, small))
    px = im.load()
    c = (small - 1) / 2
    for y in range(small):
        for x in range(small):
            d = min(1.0, (((x - c) ** 2 + (y - c) ** 2) ** 0.5) / (c * 1.25))
            t = d * d
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(BG_IN, BG_OUT))
    return im.resize((size, size), Image.BICUBIC).convert('RGBA')


def sprite(width):
    im = Image.open(SPRITE).convert('RGBA')
    bbox = im.getbbox()
    im = im.crop(bbox)
    h = round(im.height * width / im.width)
    return im.resize((width, h), Image.LANCZOS)


def glow(spr, radius):
    """Brilho laranja atrás do Firewall (sombra colorida desfocada)."""
    pad = radius * 3
    g = Image.new('RGBA', (spr.width + pad * 2, spr.height + pad * 2), (0, 0, 0, 0))
    a = spr.getchannel('A').point(lambda v: 150 if v > 40 else 0)
    color = Image.new('RGBA', spr.size, (255, 122, 26, 0))
    color.putalpha(a)
    g.alpha_composite(color, (pad, pad))
    return g.filter(ImageFilter.GaussianBlur(radius)), pad


def place(canvas, frac, transparent=False):
    """Firewall centralizado ocupando `frac` da largura do quadro."""
    size = canvas.width
    spr = sprite(round(size * frac))
    x = (size - spr.width) // 2
    y = (size - spr.height) // 2 + round(size * 0.02)
    if not transparent:
        g, pad = glow(spr, max(4, size // 40))
        canvas.alpha_composite(g, (x - pad, y - pad))
    canvas.alpha_composite(spr, (x, y))
    return canvas


def rounded(im, r):
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, im.width - 1, im.height - 1), r, fill=255)
    out = im.copy()
    out.putalpha(mask)
    return out


def save(im, name):
    im.save(os.path.join(OUT, name), optimize=True)
    print(name, im.size)


def main():
    os.makedirs(OUT, exist_ok=True)
    # normal: desenho grande, cantos arredondados (fica bonito na aba/atalho)
    big = place(background(1024), 0.74)
    for s in (192, 512):
        save(rounded(big.resize((s, s), Image.LANCZOS), round(s * 0.2)), f'icon-{s}.png')
    save(big.resize((180, 180), Image.LANCZOS).convert('RGB'), 'apple-touch-icon.png')
    save(big.convert('RGB'), 'icon-1024.png')
    # adaptável: fundo cheio, desenho menor (dentro do círculo de 80%)
    mask = place(background(1024), 0.56)
    save(mask.resize((512, 512), Image.LANCZOS).convert('RGB'), 'icon-maskable-512.png')
    save(place(Image.new('RGBA', (1024, 1024), (0, 0, 0, 0)), 0.66, transparent=True), 'icon-foreground-1024.png')  # o Android ainda encolhe a camada (inset 16,7%)
    save(background(1024).convert('RGB'), 'icon-background-1024.png')
    # abertura: fundo escuro liso com o ícone no meio (o Capacitor corta as
    # bordas conforme a tela, então o desenho fica pequeno no centro)
    splash = Image.new('RGBA', (2732, 2732), BG_OUT + (255,))
    logo = rounded(big.resize((700, 700), Image.LANCZOS), 140)
    splash.alpha_composite(logo, ((2732 - 700) // 2, (2732 - 700) // 2))
    save(splash.convert('RGB'), 'splash-2732.png')


if __name__ == '__main__':
    main()
