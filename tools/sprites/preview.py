"""Monta uma folha de contato das sprites sobre o verde da placa (pra conferir o recorte)."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'firewall-defense' / 'assets' / 'sprites'
names = sys.argv[2:] or sorted(p.stem for p in SRC.glob('*.png'))
cell = 200
cols = min(5, len(names))
rows = (len(names) + cols - 1) // cols
sheet = Image.new('RGBA', (cols * cell, rows * (cell + 20)), (34, 120, 70, 255))
d = ImageDraw.Draw(sheet)
for i, n in enumerate(names):
    im = Image.open(SRC / f'{n}.png').resize((cell - 20, cell - 20), Image.LANCZOS)
    x, y = (i % cols) * cell, (i // cols) * (cell + 20)
    sheet.alpha_composite(im, (x + 10, y + 10))
    d.text((x + 8, y + cell), n, fill='white')
sheet.save(sys.argv[1])
