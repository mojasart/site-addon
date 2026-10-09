"""
Separa 2 poses do mesmo personagem feitas numa imagem só (chat do Gemini,
fundo chapado) em 2 sprites com o MESMO enquadramento: alinhadas pelo corpo
e no mesmo tamanho de quadro, pra animação não "pular" ao trocar de pose.
(O gen.py recorta cada sprite pelo contorno, o que desalinha as poses.)

Uso:
    python tools/sprites/split_pair.py tools/sprites/raw/cicada_sheet.png cicada cicada_aura

O corpo é achado pela cor (cinza-chumbo, pouco saturado): ajuste BODY se o
personagem for de outra cor. Salva em firewall-defense/assets/sprites.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

SRC = Path(sys.argv[1])
NAMES = sys.argv[2:4]
OUT = Path(__file__).resolve().parents[2] / 'firewall-defense' / 'assets' / 'sprites'
BODY = {'lum': (45, 120), 'sat': 30}  # cor do corpo (âncora do alinhamento)
SIZE = 256

img = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
h, w, _ = img.shape
corners = np.concatenate([img[:8, :8], img[:8, -8:], img[-8:, :8], img[-8:, -8:]]).reshape(-1, 3)
bg = np.median(corners, axis=0)
dist = np.linalg.norm(img - bg, axis=2)

# fundo: o que está ligado à borda e perto da cor do fundo (igual ao gen.py)
LO, HI = 70.0, 150.0
labels, n = ndimage.label(dist < HI)
edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
core = ndimage.sum(dist < 45, labels, index=np.arange(n + 1))
holes = np.where(core > 40)[0]
region = np.isin(labels, np.union1d(edge[edge > 0], holes[holes > 0]))
alpha = np.where(region, np.clip((dist - LO) / (HI - LO), 0, 1), 1.0)
# brilho do Gemini misturado com o magenta vira um halo rosado: some com ele
# (nada da cigarra é rosado: corpo cinza, asas verdes, olhos vermelhos/verdes)
pink = np.minimum(img[..., 0], img[..., 2]) - img[..., 1]
alpha = alpha * np.clip(1 - (pink - 20) / 40, 0, 1)
a = np.maximum(alpha, 1e-3)[..., None]
rgb = np.clip(np.where(alpha[..., None] < 1, (img - (1 - a) * bg) / a, img), 0, 255)
rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)

# as duas poses: coluna vazia mais larga perto do meio separa uma da outra
solid = alpha > 0.03
cols = solid.any(axis=0)
mid = w // 2
gap = [x for x in range(w // 4, 3 * w // 4) if not cols[x]]
split = min(gap, key=lambda x: abs(x - mid)) if gap else mid
print('separação na coluna', split)

frames = []
for x0, x1 in ((0, split), (split, w)):
    part = rgba[:, x0:x1]
    a_ = part[..., 3] > 8
    # só a cigarra: o maior pedaço (pixels soltos longe dela não contam)
    lab, nl = ndimage.label(ndimage.binary_dilation(a_, iterations=2))
    if nl > 1:
        big = 1 + int(np.argmax(ndimage.sum(a_, lab, index=np.arange(1, nl + 1))))
        a_ = a_ & (lab == big)
        part = part.copy()
        part[..., 3] = np.where(a_, part[..., 3], 0)
    # corpo: pixels escuros e opacos (cinza-esverdeado), centro dele = âncora
    c = part[..., :3].astype(np.float32)
    lum = c.mean(axis=2)
    sat = c.max(axis=2) - c.min(axis=2)
    body = a_ & (lum > BODY['lum'][0]) & (lum < BODY['lum'][1]) & (sat < BODY['sat'])  # corpo (sem contorno, olhos e asas)
    ys, xs = np.nonzero(body)
    cy, cx = ys.mean(), xs.mean()
    ys2, xs2 = np.nonzero(a_)
    frames.append({'img': part, 'cx': cx, 'cy': cy,
                   'ext': max(cx - xs2.min(), xs2.max() - cx, cy - ys2.min(), ys2.max() - cy)})
    print('pose: centro do corpo', round(cx), round(cy), 'alcance', round(frames[-1]['ext']))

# mesmo quadro pras duas: quadrado centrado no corpo, cabendo a maior
half = int(max(f['ext'] for f in frames) * 1.04) + 2
for f, name in zip(frames, NAMES):
    sq = Image.new('RGBA', (2 * half, 2 * half))
    sq.paste(Image.fromarray(f['img'], 'RGBA'), (int(round(half - f['cx'])), int(round(half - f['cy']))))
    sq = sq.resize((SIZE, SIZE), Image.LANCZOS)
    sq.save(OUT / f'{name}.png', optimize=True)
    print('salvo', OUT / f'{name}.png')
