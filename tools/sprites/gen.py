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

# o vermelho é o original; as outras cores são editadas a partir dele pra ficarem iguais
VIRUS = ('Three-quarter view: the character hops toward the RIGHT side of the image, its round body slightly turned to the right and both big eyes looking to the RIGHT. '
         'A cute mischievous round computer virus germ monster: '
         'a bright red ball-shaped body with 6 short stubby rounded spikes ending in little balls, '
         'huge white eyes with big black pupils and angry eyebrows, wide toothy cheeky grin, two tiny feet. ')
RECOLOR = ('Edit this image: keep exactly the same character, pose, shape, eyes, outline, size and style, '
           'only change the body and spike color from red to {color}. Do not change anything else. ')

ASSETS = {
    # ── Vírus (camadas, como os balões do Bloons) ────────
    'virus_red': ('green', VIRUS),
    'virus_blue': ('magenta', RECOLOR.format(color='bright blue'), 'virus_red'),
    'virus_green': ('magenta', RECOLOR.format(color='bright green'), 'virus_red'),
    'virus_yellow': ('magenta', RECOLOR.format(color='bright yellow'), 'virus_red'),
    'virus_pink': ('green', RECOLOR.format(color='hot pink'), 'virus_red'),
    # ── Especiais e chefões ──────────────────────────────
    'worm': ('magenta', SIDE_RIGHT + 'A goofy cartoon computer worm / caterpillar monster made of 4 chunky round '
             'lime-green segments in a row with dark blue stripes, the big head on the RIGHT with huge eyes, '
             'two little antennae and a sneaky grin, tiny stubby feet under each segment, the tail on the left. '),
    'trojan': ('green', SIDE_RIGHT + 'A chubby round grey-purple cartoon virus monster wearing an oversized shiny '
               'silver spartan helmet with a big red crest, the helmet opening shows angry eyes looking to the RIGHT, '
               'holding a tiny round wooden shield, two tiny feet. '),
    'locker': ('green', SIDE_RIGHT + 'A big chubby violet cartoon virus mini-boss monster wrapped in thick heavy '
               'grey iron chains crossing its body, a big golden padlock hanging on its belly, small stubby spikes, '
               'angry eyes looking to the RIGHT and a mean toothy grin, two tiny stomping feet. '),
    'ransomware': ('green', SIDE_RIGHT + 'A big chubby purple cartoon blimp / airship boss monster floating, '
                   'facing RIGHT with huge angry eyes and a toothy evil grin at the front, little tail fins at the back, '
                   'a big golden padlock with a dollar sign hanging on its belly. No feet. '),
    # ── Defesas (personagens chibi olhando pra direita) ──
    # versão original (com dardo); a do jogo é editada a partir dela
    'hacker_dart': ('green', 'Full body, chibi proportions (big head, small body), three-quarter view facing and looking to the '
               'RIGHT, standing on two feet. A cool cartoon anonymous hacker in an oversized dark charcoal hoodie with '
               'the hood up, wearing a white Guy Fawkes style mask (rosy cheeks, thin curled black mustache, narrow '
               'smiling eyes, little pointed beard), dark pants and sneakers, orange gloves, holding a glowing '
               'green data dart ready to throw in the right hand. '),
    'hacker': ('green', 'Edit this image: keep exactly the same character, pose, mask, hoodie, colors, outline, size and '
               'style, but replace the green dart in his hand with a small chunky cartoon computer keyboard (dark grey '
               'with light keys and a few glowing green keys) held up in the same hand, ready to throw. '
               'Do not change anything else. ', 'hacker_dart'),
    # Penguin Linux: parado (braços pra baixo) e congelando (braços abertos, editado a partir do parado)
    'pinguim': ('magenta', 'Full body, chibi proportions (big head, round chubby body), three-quarter view facing and '
                'looking to the RIGHT, standing on two orange feet. A cute cartoon baby penguin with a dark navy blue '
                'body, white belly and face, small orange beak, rosy cheeks, big friendly eyes, wearing a cozy bright '
                'cyan knitted scarf around the neck with one end hanging down the front, both little flippers '
                'resting down along the sides of the body. '),
    'pinguim_open': ('magenta', 'Edit this image: keep exactly the same penguin, scarf, colors, outline, size and style, '
                     'but raise both flippers wide open out to the sides (like a happy cheer, casting a freeze spell) '
                     'with a happy open-mouth expression. Do not add anything else. ', 'pinguim'),
    # Golem Firewall: parado e batendo no chão (editado a partir do parado)
    'firewall': ('green', 'Full body, chibi proportions (big blocky head-body, short legs), three-quarter view facing '
                 'and looking to the RIGHT, standing on two feet. A cute but tough cartoon golem made of orange-red '
                 'bricks with lighter mortar lines, a peach face plate with big determined eyes and thick eyebrows, '
                 'bright orange-yellow flames burning on top of its head, two big chunky brick fists resting down '
                 'at its sides. '),
    'firewall_attack': ('green', 'Edit this image: keep exactly the same golem, bricks, colors, outline, size and style, '
                        'but raise both big brick fists high above its head ready to smash the ground, with a fierce '
                        'roaring open mouth and the head flames burning bigger and brighter. '
                        'Do not add anything else. ', 'firewall'),
    # ── HUD ──────────────────────────────────────────────
    'coin': ('magenta', 'A shiny orange round Bitcoin coin with a big white tilted bitcoin symbol "₿" in the middle, front view. '),
    'heart': ('magenta', 'A glossy red cartoon heart icon for lives, front view. '),
    # Minerador com picareta (base das versões criança e adolescente)
    'minerador_pickaxe': ('magenta', 'Full body, chibi proportions (big head, small body), three-quarter view facing and looking '
                  'to the RIGHT, standing on two feet. A jolly cartoon crypto miner with a yellow hard hat with a '
                  'glowing headlamp, a bushy orange beard, rosy cheeks, a red shirt, blue overalls and brown boots, '
                  'holding a wooden pickaxe with a grey metal head resting on his shoulder. '),
    'minerador_pickaxe_attack': ('magenta', 'Edit this image: keep exactly the same miner, face, beard, helmet, clothes, colors, '
                         'outline, size and style. Change only the pose: he swings the SAME single pickaxe down with both '
                         'hands, the handle going from his hands diagonally down to the RIGHT, and its ONE metal head '
                         'striking the ground in front of his feet. The pickaxe has exactly one metal head, at the lower '
                         'end; nothing is left on his shoulder. Focused effort expression, a few small grey rock chips at '
                         'the impact point. Do not add anything else. ', 'minerador_pickaxe'),
    # ── Servidor (o que estamos protegendo) ──────────────
    'server': ('magenta', 'Front view. A cute friendly server computer character: a chunky blue rack server box '
               'with a cyan screen showing a happy smiling face, small green status LEDs below. '),
    # gerada a partir da imagem do 'server' pra ficar idêntica, só mudando a tela
    'server_hurt': ('magenta', 'Edit this image: keep the exact same server box, angle, size, colors and style, '
                    'but make the screen red and showing a dizzy hurt face with X eyes and a wavy mouth, '
                    'and make the 3 LEDs red. Do not add arms, legs or anything else. ', 'server'),
    # Minerador adulto (nível 3): o mesmo cara, agora minerando bitcoin num computador
    # (rascunho → versão final sem o monitor que parecia estar no ombro)
    'minerador_pc_draft': ('magenta', 'Edit this image: keep exactly the same man (same face, bushy orange beard, rosy cheeks, '
                  'yellow hard hat with glowing headlamp, red shirt, blue overalls, brown boots), the same outline, colors '
                  'and cartoon style, three-quarter view facing and looking to the RIGHT. Remove the pickaxe. Now he is a '
                  'crypto miner at his computer: he sits on a small stool at a small wooden desk placed in front of him on '
                  'the RIGHT, typing on a chunky keyboard, with a chunky retro computer monitor on the desk whose screen '
                  'shows a big orange Bitcoin symbol, and a small PC tower with glowing green fans next to the desk. '
                  'Compact composition: the man, desk and computer together, all fully visible. '
                  'Do not add anything else. ', 'minerador_pickaxe'),
    'minerador': ('magenta', 'Edit this image: REMOVE completely the beige monitor with the Bitcoin symbol that is on '
                     'the left, next to his shoulder (only background there now). Keep the single grey monitor standing on '
                     'the desk in front of him, but make its screen show a big glowing orange Bitcoin symbol. Keep exactly '
                     'the same man, pose, desk, keyboard, PC tower, stool, colors, outline, size and style. '
                     'Do not add anything else. ', 'minerador_pc_draft'),
    'minerador_attack': ('magenta', 'Edit this image: keep exactly the same man, desk, computer, colors, outline, size, '
                         'framing and style. Change only: he raises both fists in the air celebrating with a big happy '
                         'open-mouth smile, and the monitor glows brighter with the Bitcoin symbol and a couple of small '
                         'golden Bitcoin coins popping out of the screen. Do not add anything else. ', 'minerador'),
    # Robô NMAP (gerado em outra sessão; aqui só serve de referência pras idades)
    'scanner': ('magenta', 'Full body, chibi proportions, three-quarter view facing and looking to the RIGHT, standing on '
                'two feet. A cute round blue cartoon robot with a big red camera eye, one cartoon eye, a small white '
                'satellite dish on its head, chunky arms and legs. '),
}

# ── Idades (nível 1 = criança, nível 2 = adolescente, nível 3 = adulto) ──
# Editadas a partir do adulto pra manter roupa, cores e estilo; as poses de
# ataque de cada idade são editadas a partir da versão parada da mesma idade.
AGE = ('Edit this image: keep exactly the same character design, outfit, colors, accessories, outline style, pose, '
       'facing direction (three-quarter view looking to the RIGHT) and cartoon style, but turn it into a {age} '
       'version of the same character: {desc} Full body, fully visible. Do not add anything else. ')
KID = 'small young CHILD (about 6 years old)'
TEEN = 'TEENAGER (about 14 years old)'
AGES = {
    'hacker': ('green', 'hacker', {
        'kid': 'a tiny NERDY kid hacker WITHOUT the mask: his face is visible, a cute nerd boy with big round thick-rimmed '
               'glasses, freckles on his cheeks and nose, messy brown hair, a shy buck-tooth smile, the hood down on his '
               'back, very round chibi body with a much bigger head than the body, short little arms and legs, the dark '
               'hoodie oversized on him, holding a small toy-sized keyboard.',
        'teen': 'a REBELLIOUS TEEN hacker, noticeably shorter and skinnier than the adult: the hood is DOWN on his back '
                'and his face is visible, a messy brown MULLET haircut (short on top and sides, long hair at the back of '
                'the neck), a cocky smirk and confident half-closed eyes, a small band-aid on the cheek, the white Guy '
                'Fawkes mask pushed up to the side of his head, big chunky headphones around his neck, the hoodie a bit '
                'loose with rolled-up sleeves, sneakers with bright green laces, same keyboard.',
    }),
    'pinguim': ('magenta', 'pinguim', {
        'kid': 'a tiny fluffy newborn penguin chick, very round and small, with soft fluffy fuzz on the head, '
               'stubby little flippers, the same cyan scarf a bit too long for him.',
        'teen': 'a TEEN penguin, noticeably smaller and rounder than the adult, with a few leftover fluffy grey baby '
                'down tufts sticking out on top of its head and on the chest, same navy body, white belly and cyan scarf.',
    }),
    'firewall': ('green', 'firewall', {
        'kid': 'a tiny baby golem made of only a few small rounded orange-red bricks, very round and cute, '
               'little stubby fists, only a small candle-sized flame on top of its head.',
        'teen': 'a TEEN golem, noticeably smaller and rounder than the adult, made of fewer and bigger rounded bricks, '
                'medium fists, a medium flame on its head and a cocky confident grin.',
    }),
    'minerador': ('magenta', 'minerador_pickaxe', {
        'kid': 'a little kid miner with NO beard, chubby rosy cheeks, the yellow hard hat oversized on his head, '
               'same red shirt and blue overalls, carrying a small pickaxe on his shoulder. The pickaxe is a normal mining pickaxe '
               'with ONE wooden handle and exactly ONE metal head at the top end (not double, no second head).',
        'teen': 'a tall skinny TEEN miner with freckles, a short scruffy orange goatee, a red bandana around the neck, '
                'shirt sleeves rolled up, same yellow hard hat, red shirt and blue overalls, carrying the pickaxe on his '
                'shoulder.',
    }),
    'scanner': ('magenta', 'scanner', {
        'kid': 'a tiny BABY robot: a very small round egg-shaped body that is almost all head, tiny stubby arms and '
               'legs, a mini toy-like satellite dish on its head, a huge cute natural eye, the same red camera eye '
               'and blue color.',
        'teen': 'a TEEN robot, noticeably smaller and rounder than the adult, with a smaller dish, a little antenna '
                'with a blinking green light on the head, shiny fresh paint and a bigger cheeky eye. Keep the face layout exactly '
                'like the original: the red camera eye on the LEFT side of the face (image left) and the natural cartoon '
                'eye on the RIGHT side (image right), the dish on the upper left.',
    }),
}
# poses de ataque (o mesmo texto do adulto, aplicado em cima da idade)
AGE_ATTACK = {'pinguim': 'pinguim_open', 'firewall': 'firewall_attack', 'minerador': 'minerador_pickaxe_attack'}
for base, (bg, ref, descs) in AGES.items():
    for age, label in (('kid', KID), ('teen', TEEN)):
        name = f'{base}_{age}'
        ASSETS[name] = (bg, AGE.format(age=label, desc=descs[age]), ref)
        if base in AGE_ATTACK:
            pose = AGE_ATTACK[base]
            suffix = 'attack' if base == 'minerador' else pose.split('_', 1)[1]
            ASSETS[f'{name}_{suffix}'] = (bg, ASSETS[pose][1].replace('same miner, face, beard,', 'same young miner, same face (do not add or change facial hair),'), name)

# o minerador criança batendo: rejuvenesce a pose do adulto (editar a criança
# parada fazia a picareta ganhar duas pontas)
ASSETS['minerador_kid_attack'] = ('magenta', AGE.format(age=KID, desc=(
    'a little kid miner with NO beard and NO facial hair, chubby rosy cheeks, the yellow hard hat oversized on his '
    'head, same red shirt and blue overalls, the SAME pose swinging the same single pickaxe down to the ground '
    '(exactly one metal head, at the lower end, striking the ground; nothing on his shoulder).')), 'minerador_pickaxe_attack')

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

        with ThreadPoolExecutor(6) as ex:
            while todo:
                wave = [n for n in todo if len(ASSETS[n]) < 3 or ASSETS[n][2] not in todo]
                list(ex.map(job, wave))
                todo = [n for n in todo if n not in wave]

    for n in names:
        if (RAW_DIR / f'{n}.png').exists():
            process(n)
    print('pronto ->', OUT_DIR)


if __name__ == '__main__':
    main()
