"""
Gera as sprites do Firewall Defense com o Gemini (Nano Banana Pro).

Cada sprite é pedida sobre um fundo chapado (magenta ou verde), depois o
fundo é removido por flood fill a partir das bordas, a imagem é recortada
e salva em firewall-defense/assets/sprites/<nome>.png (fundo transparente).

Uso:
    python tools/sprites/gen.py                 # gera só as que faltam
    python tools/sprites/gen.py virus_red tower_firewall --force
    python tools/sprites/gen.py --process-only  # só reprocessa os brutos

A chave vem de GEMINI_API_KEY (ou do arquivo .env na raiz do repo).
"""

import argparse
import base64
import json
import os
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = Path(__file__).resolve().parent / 'raw'
OUT_DIR = ROOT / 'firewall-defense' / 'assets' / 'sprites'
MODEL = 'gemini-3-pro-image'
OUT_SIZE = 256  # lado maior da sprite final

LOOK_3D = (
    'Polished mobile game asset in the style of Bloons TD 6 and Clash Royale: '
    'chunky, cute, cartoon 3D-rendered look, thick dark navy outline around the whole silhouette, '
    'vivid saturated colors, soft shading, glossy highlights, high readability at small size. '
)
# personagens e cenário: "desenho animado" 2D
LOOK_TOON = (
    'Classic 2D cartoon art for a mobile game, like a Cartoon Network / Brawl Stars / Bloons sticker: '
    'flat bold saturated colors with simple cel shading (one shadow tone and one small white highlight), '
    'very thick dark navy outline around the whole silhouette, exaggerated chunky rubbery proportions, '
    'huge expressive cartoon eyes on characters. '
    'NOT 3D, NOT realistic, NOT a render. High readability at small size. '
)
STYLE = (
    '{look}'
    'Exactly ONE object and nothing else (no extra icons, particles, circuit lines or decorations around it), centered, filling about 80% of the frame, fully visible (nothing cropped). '
    'Isolated on a perfectly flat, uniform, solid {bg_name} ({bg_hex}) background: '
    'no gradient, no ground, no cast shadow, no glow on the background, no text, no letters, no border, no frame. '
)

BG = {
    'magenta': ('pure magenta', '#FF00FF', (255, 0, 255)),
    'green': ('pure chroma-key green', '#00FF00', (0, 255, 0)),
}

SIDE_RIGHT = 'Side view: the character stands upright and walks toward the RIGHT side of the image. '
HERO = ('Full body, chibi proportions (big head, small body), friendly confident heroic expression, '
        'standing on two feet, facing and looking to the RIGHT (3/4 side view). ')
PAD = ('Seen from a high 3/4 top-down angle (like a tower build spot in Kingdom Rush): '
       'a round flat placement pad / platform on the ground, wider than tall, nothing standing on it. ')

ASSETS = {
    # ── Defensores (personagens em pé, olhando pra direita) ──
    'hacker': ('magenta', HERO + 'A cool young hacker kid in a dark navy hoodie with the hood up, glowing green '
               'goggles on the forehead, sneakers, holding a glowing green data dart ready to throw. '),
    'roteador': ('magenta', HERO + 'A cute little Wi-Fi router robot character: a teal rounded box body with 3 '
                 'antennas on top, a friendly face screen with big eyes, blinking status lights, tiny legs and arms. '),
    'firewall': ('green', HERO + 'A chunky friendly golem made of orange-red bricks, with bright flames burning on its '
                 'head and shoulders, big brick fists, glowing yellow eyes, strong guardian pose. '),
    'scanner': ('magenta', HERO + 'A cute round blue robot with a white satellite radar dish on its head, one big '
                'glowing red laser eye lens, small antenna, stubby arms and legs. '),
    'engenheiro': ('magenta', HERO + 'A cheerful engineer in a yellow hard hat and orange overalls with a tool belt, '
                   'holding a round black cartoon bomb with a lit fuse and a little circuit pattern on it. '),
    'minerador': ('magenta', HERO + 'A jolly crypto miner with a miner helmet with a headlamp, a bushy beard, '
                  'brown work clothes, a pickaxe on the shoulder and a shiny golden coin with a dollar sign. '),
    # ── Pontos de instalação ─────────────────────────────
    'slot_plataforma': ('magenta', PAD + 'Grey-blue metal circular pad with bolts around the rim and a subtle '
                        'light-grey hexagon pattern in the middle. '),
    'slot_terminal': ('magenta', PAD + 'Dark metal circular pad with a glowing light-blue holographic ring and a '
                      'small screen/antenna symbol in the middle, a terminal spot for a scanner. '),
    'slot_nucleo': ('green', PAD + 'Dark metal circular pad with a glowing orange-red reactor core ring and warm '
                    'glowing vents, a heavy-duty spot for a firewall. '),
    # ── Inimigos ─────────────────────────────────────────
    'virus': ('green', 'Front view: the character stands upright and looks at the camera. '
              'A cute mischievous round computer virus germ monster: '
              'a bright red ball-shaped body with 6 short stubby rounded spikes ending in little balls, '
              'huge white eyes with big black pupils and angry eyebrows, wide toothy cheeky grin, two tiny feet. '),
    'worm': ('magenta', SIDE_RIGHT + 'A goofy cartoon computer worm / caterpillar monster made of 4 chunky round '
             'lime-green segments in a row with dark blue stripes, the big head on the RIGHT with huge eyes, '
             'two little antennae and a sneaky grin, tiny stubby feet under each segment, the tail on the left. '),
    'trojan': ('green', SIDE_RIGHT + 'A chubby round grey-purple cartoon virus monster wearing an oversized shiny '
               'silver spartan helmet with a big red crest, the helmet opening shows angry eyes looking to the RIGHT, '
               'holding a tiny round wooden shield, two tiny feet. '),
    'ransomware': ('green', SIDE_RIGHT + 'A big chubby purple cartoon blimp / airship boss monster floating, '
                   'facing RIGHT with huge angry eyes and a toothy evil grin at the front, little tail fins at the back, '
                   'a big golden padlock with a dollar sign hanging on its belly. No feet. '),
    # ── Outros ───────────────────────────────────────────
    'server': ('magenta', 'Front view. A cute friendly server computer character: a chunky blue rack server box '
               'with a cyan screen showing a happy smiling face, small green status LEDs below. '),
    # gerada a partir da imagem do 'server' pra ficar idêntica, só mudando a tela
    'server_hurt': ('magenta', 'Edit this image: keep the exact same server box, angle, size, colors and style, '
                    'but make the screen red and showing a dizzy hurt face with X eyes and a wavy mouth, '
                    'and make the 3 LEDs red. Do not add arms, legs or anything else. ', 'server'),
    'coin': ('magenta', 'A shiny golden hexagonal crypto coin with a dollar sign "$" in the middle, front view. '),
    'heart': ('magenta', 'A glossy red cartoon heart icon for lives, front view. '),
}

# estas usam o visual "3D de jogo mobile"; o resto é desenho animado 2D
LOOK_3D_ASSETS = {'server', 'server_hurt', 'coin', 'heart'}


def load_key():
    key = os.environ.get('GEMINI_API_KEY')
    env = ROOT / '.env'
    if not key and env.exists():
        for line in env.read_text().splitlines():
            if line.startswith('GEMINI_API_KEY='):
                key = line.split('=', 1)[1].strip()
    if not key:
        sys.exit('Defina GEMINI_API_KEY (ou crie .env na raiz).')
    return key


def generate(name, key, model):
    bg, subject, *ref = ASSETS[name]
    bg_name, bg_hex, _ = BG[bg]
    look = LOOK_3D if name in LOOK_3D_ASSETS else LOOK_TOON
    parts = [{'text': subject + STYLE.format(look=look, bg_name=bg_name, bg_hex=bg_hex)}]
    if ref:  # imagem de referência (edição em cima de outra sprite)
        data = base64.b64encode((RAW_DIR / f'{ref[0]}.png').read_bytes()).decode()
        parts.insert(0, {'inlineData': {'mimeType': 'image/png', 'data': data}})
    body = {
        'contents': [{'parts': parts}],
        'generationConfig': {'responseModalities': ['IMAGE'], 'imageConfig': {'aspectRatio': '1:1'}},
    }
    req = urllib.request.Request(
        f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
        data=json.dumps(body).encode(),
        headers={'Content-Type': 'application/json', 'x-goog-api-key': key},
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        data = json.load(r)
    for part in data['candidates'][0]['content']['parts']:
        if 'inlineData' in part:
            RAW_DIR.mkdir(parents=True, exist_ok=True)
            (RAW_DIR / f'{name}.png').write_bytes(base64.b64decode(part['inlineData']['data']))
            return
    raise RuntimeError(f'{name}: resposta sem imagem: {json.dumps(data)[:400]}')


def process(name):
    """Remove o fundo chapado, recorta e redimensiona."""
    _, _, bg_rgb = BG[ASSETS[name][0]]
    img = np.asarray(Image.open(RAW_DIR / f'{name}.png').convert('RGB')).astype(np.float32)
    # a cor real do fundo pode variar um pouco do pedido: usa a média dos cantos
    h, w, _ = img.shape
    corners = np.concatenate([img[:8, :8], img[:8, -8:], img[-8:, :8], img[-8:, -8:]]).reshape(-1, 3)
    bg = np.median(corners, axis=0)
    # o modelo às vezes escurece o fundo; só cai no pedido se os cantos não forem uniformes
    if corners.std(axis=0).max() > 12:
        bg = np.array(bg_rgb, np.float32)
    dist = np.linalg.norm(img - bg, axis=2)

    LO, HI = 70.0, 150.0
    # só conta como fundo o que está ligado à borda (preserva rosa/verde dentro do objeto)
    labels, n = ndimage.label(dist < HI)
    edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    # ...e os buracos internos (entre pernas, embaixo do braço) que têm um miolo
    # com a cor exata do fundo
    core = ndimage.sum(dist < 45, labels, index=np.arange(n + 1))
    holes = np.where(core > 40)[0]
    region = np.isin(labels, np.union1d(edge[edge > 0], holes[holes > 0]))
    alpha = np.where(region, np.clip((dist - LO) / (HI - LO), 0, 1), 1.0)

    # tira o "vazamento" da cor do fundo nas bordas semitransparentes
    a = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.where(alpha[..., None] < 1, (img - (1 - a) * bg) / a, img)
    rgb = np.clip(rgb, 0, 255)

    rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    out = Image.fromarray(rgba, 'RGBA')
    bbox = out.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    out = out.crop(bbox)
    # deixa quadrado (centro do objeto = centro da imagem) e com folga de 4%
    side = int(max(out.size) * 1.04)
    sq = Image.new('RGBA', (side, side))
    sq.paste(out, ((side - out.width) // 2, (side - out.height) // 2))
    sq = sq.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sq.save(OUT_DIR / f'{name}.png', optimize=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('names', nargs='*')
    ap.add_argument('--force', action='store_true', help='gera de novo mesmo se já existir')
    ap.add_argument('--process-only', action='store_true')
    ap.add_argument('--model', default=MODEL)
    args = ap.parse_args()

    names = args.names or list(ASSETS)
    for n in names:
        if n not in ASSETS:
            sys.exit(f'sprite desconhecida: {n}')

    if not args.process_only:
        key = load_key()
        todo = [n for n in names if args.force or not (RAW_DIR / f'{n}.png').exists()]

        def job(n):
            try:
                generate(n, key, args.model)
                print('ok   ', n, flush=True)
            except Exception as e:  # noqa: BLE001
                print('ERRO ', n, e, flush=True)

        first = [n for n in todo if len(ASSETS[n]) < 3]
        with ThreadPoolExecutor(6) as ex:
            list(ex.map(job, first))
            list(ex.map(job, [n for n in todo if n not in first]))

    for n in names:
        if (RAW_DIR / f'{n}.png').exists():
            process(n)
    print('pronto ->', OUT_DIR)


if __name__ == '__main__':
    main()
