"""Capturas de tablet pra Play Store (7" e 10"), a partir das capturas sem frase.

O jogo num tablet (16:10) fica com o mapa inteiro na largura e faixas azuis
em cima e embaixo: a tela do tablet aqui mostra exatamente isso. A imagem
final é 16:9 (o que a Play pede), com a frase em cima e o tablet desenhado.

Rodar da raiz do repo:
  python tools/tablet_shots.py        português: store/sem-texto -> store/tablet/{7,10}-polegadas
  python tools/tablet_shots.py en     inglês:    store/en/no-text -> store/en/tablet/{7,10}-inch
Precisa da Lilita One em TTF: converte sozinho do woff2 (fontTools + brotli).
"""
import os
import sys
import tempfile
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), '..')
WOFF = os.path.join(ROOT, 'firewall-defense', 'assets', 'fonts', 'LilitaOne-latin.woff2')

# Por idioma: de onde vêm as capturas sem frase, pra onde vão, o nome da
# pasta de cada tamanho e as frases (arquivo, parte branca, parte amarela)
LANGS = {
    'pt': {
        'src': os.path.join(ROOT, 'store', 'sem-texto'),
        'out': os.path.join(ROOT, 'store', 'tablet'),
        'dir': '{}-polegadas',
        'shots': [
            ('01-inicio', 'Defenda o servidor', 'contra os vírus!'),
            ('02-partida', 'Monte sua defesa com', 'hackers, golens e pinguins'),
            ('03-chefao', 'Enfrente chefões como', 'o Ransomware'),
            ('04-oceano', '3 mundos e', '45 fases pra vencer'),
            ('05-darknet', 'Evolua suas defesas na', 'Dark Net'),
            ('06-mapas', 'Ganhe 3 estrelas e', 'platine cada fase'),
            ('07-catalogo', 'Descubra cada ameaça no', 'catálogo'),
        ],
    },
    'en': {
        'src': os.path.join(ROOT, 'store', 'en', 'no-text'),
        'out': os.path.join(ROOT, 'store', 'en', 'tablet'),
        'dir': '{}-inch',
        'shots': [
            ('01-title', 'Defend the server', 'from the viruses!'),
            ('02-match', 'Build your defense with', 'hackers, golems & penguins'),
            ('03-boss', 'Take on bosses like', 'Ransomware'),
            ('04-ocean', '3 worlds and', '45 levels to beat'),
            ('05-darknet', 'Upgrade your defenses on the', 'Dark Net'),
            ('06-maps', 'Earn 3 stars and', 'go Platinum'),
            ('07-catalog', 'Discover every threat in the', 'catalog'),
        ],
    },
}
SIZES = {'7': (1920, 1080), '10': (2560, 1440)}
OUTLINE = (27, 35, 64)
GOLD = (255, 210, 63)
GAME_BG = (31, 43, 82)  # #1f2b52: o fundo atrás do jogo


def font_path():
    from fontTools.ttLib import TTFont
    path = os.path.join(tempfile.gettempdir(), 'LilitaOne.ttf')
    if not os.path.exists(path):
        f = TTFont(WOFF)
        f.flavor = None
        f.save(path)
    return path


def background(W, H):
    top, bottom = (43, 63, 134), (13, 20, 48)
    bg = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(bg)
    for y in range(H):
        k = y / (H - 1)
        d.line([(0, y), (W, y)], fill=tuple(round(a + (b - a) * k) for a, b in zip(top, bottom)))
    # raios fracos saindo de cima
    rays = Image.new('L', (W, H), 0)
    dr = ImageDraw.Draw(rays)
    import math
    cx, cy = W / 2, H * 0.11
    for i in range(24):
        a = i * math.pi / 12
        b = a + 0.07
        r = W * 1.5
        dr.polygon([(cx, cy), (cx + r * math.cos(a), cy + r * math.sin(a)), (cx + r * math.cos(b), cy + r * math.sin(b))], fill=12)
    bg.paste((255, 255, 255), mask=rays)
    return bg


def caption(img, a, b, size, y):
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(font_path(), size)
    sa = a + ' '
    wa = d.textlength(sa, font=f)
    wb = d.textlength(b, font=f)
    x0 = (img.width - wa - wb) / 2
    sw = round(size * 0.2)
    for dy, c1, c2 in [(round(size * 0.09), OUTLINE, OUTLINE), (0, (255, 255, 255), GOLD)]:
        d.text((x0, y + dy), sa, font=f, fill=c1, stroke_width=sw, stroke_fill=OUTLINE, anchor='lm')
        d.text((x0 + wa, y + dy), b, font=f, fill=c2, stroke_width=sw, stroke_fill=OUTLINE, anchor='lm')


def tablet(src, shot, W, H):
    k = W / 1920
    img = background(W, H)
    caption(img, *shot[1:], round(70 * k), round(92 * k))
    # tela 16:10 com o jogo na largura e as faixas em cima e embaixo
    sw = round(1290 * k)
    sh = round(sw * 10 / 16)
    screen = Image.new('RGB', (sw, sh), GAME_BG)
    game = Image.open(os.path.join(src, shot[0] + '.jpg')).convert('RGB')
    gh = round(sw * game.height / game.width)
    screen.paste(game.resize((sw, gh), Image.LANCZOS), (0, (sh - gh) // 2))
    bezel = round(30 * k)
    dw, dh = sw + bezel * 2, sh + bezel * 2
    x, y = (W - dw) // 2, round(172 * k)
    # sombra
    shadow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(shadow).rounded_rectangle((x + 8 * k, y + 18 * k, x + dw + 8 * k, y + dh + 18 * k), round(48 * k), fill=150)
    img.paste((0, 0, 0), mask=shadow.filter(ImageFilter.GaussianBlur(18 * k)))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((x - 6 * k, y - 6 * k, x + dw + 6 * k, y + dh + 6 * k), round(52 * k), fill=OUTLINE)
    d.rounded_rectangle((x, y, x + dw, y + dh), round(46 * k), fill=(16, 22, 44))
    d.ellipse((x + bezel / 2 - 5 * k, y + dh / 2 - 5 * k, x + bezel / 2 + 5 * k, y + dh / 2 + 5 * k), fill=(40, 50, 84))  # câmera
    mask = Image.new('L', (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw - 1, sh - 1), round(14 * k), fill=255)
    img.paste(screen, (x + bezel, y + bezel), mask)
    return img


def main(lang='pt'):
    cfg = LANGS[lang]
    for inch, (W, H) in SIZES.items():
        out = os.path.join(cfg['out'], cfg['dir'].format(inch))
        os.makedirs(out, exist_ok=True)
        for shot in cfg['shots']:
            tablet(cfg['src'], shot, W, H).save(os.path.join(out, shot[0] + '.png'), optimize=True)
        print(lang, inch, len(cfg['shots']))


if __name__ == '__main__':
    main(*sys.argv[1:2])
