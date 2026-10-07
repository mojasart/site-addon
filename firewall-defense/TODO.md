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

- [ ] **Upgrade de pierce pro Hacker**: o teclado volta a atravessar vários vírus
  (no `apply` do upgrade: `s.pierce = 2`)

## Balanceamento

- [ ] Recalibrar os mapas com os bots (`node tools/sim/calibrate.js` e conferir com `run.js`)
  depois das mudanças no Hacker (sem pierce) e no Honeypot (dura 15 s)
