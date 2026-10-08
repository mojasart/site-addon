# TODO

Lista do que falta fazer no jogo. Marque com `[x]` quando terminar.

## Inimigos

- [ ] **Inimigo voador**: passa voando por cima do caminho
  - O **Golem Firewall** não pega ele (a onda de fogo é no chão)
  - O **Honeypot** não segura ele (passa por cima da isca sem parar)
  - Definir quais defesas acertam (Hacker? Robô NMAP? o Penguin Linux deixa lento?)
  - Entrada em `src/data/enemies.js` (ex.: um campo `flying: true`), desenho em `src/render/viruses.js`
    e sprite em `tools/sprites/gen.py`
  - Tirar os voadores do alvo do pulso (`enemiesInRange` em `src/game.js`) e da isca (`baitAt`)
  - Colocar nas rodadas (`src/data/rounds.js`), descrição e `lore` pro catálogo

## Defesas

- [x] **Upgrade de pierce pro Hacker**: o teclado volta a atravessar vários vírus
  (no `apply` do upgrade: `s.pierce = 2`)
- [ ] **Minerador no Cabo Submarino (season 3)**: lá não tem pilha de bitcoin, então ele só
  vai poder minerar com um **upgrade específico** (a definir: nome, custo e em que nível entra)
  - Hoje ele minera em qualquer lugar na season 3; a regra fica em `Game.canMine` (`src/game.js`):
    trocar o `return true` da season 3 por algo como `return !!tower.stats.offshore`
  - Os bots (`tools/sim/bot.js`) vão precisar comprar esse upgrade antes de contar com o Minerador

## Dark Net

- [x] **Árvore de upgrades, fase 1**: nó central (Acesso Root) + 1 ramo por defesa
  (`TREE` em `src/data/darknet.js`, tela em `src/scenes/DarkNetScene.js`)
- [ ] **Árvore, fase 2**: próximos nós saindo de cada ramo (os "?" na tela). Seguir o estilo RNG
  ("X tem Y% de chance de Z"; campos `*Chance` lidos em `entities/Tower.js`, `Projectile.js`, `Enemy.js`). Basta adicionar em
  `TREE` com `parent: '<id do ramo>'` e posicionar o nó em `DarkNetScene.layout()`

## Balanceamento

- [x] Recalibrar os mapas com os bots (`node tools/sim/calibrate.js` e conferir com `run.js`)
  depois das mudanças no Hacker (sem pierce) e no Honeypot (dura 15 s)
