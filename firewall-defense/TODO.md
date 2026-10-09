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

## Arsenal (inventário de personagens)

- [ ] **Comprar personagens novos e levar 8 pra cada fase**
  - Loja de personagens: os novos (ex.: o **Executivo** e os próximos comandantes) são comprados
    uma vez e ficam no **arsenal** do jogador (guardar em `save.js`, ex.: `save.owned`)
  - Antes de cada fase, tela de **escolher 8** do arsenal (o "deck" da partida); o painel da loja
    da fase (`layout` em `src/render/ui.js`) mostra só esses 8 em vez de `TOWER_ORDER` inteiro
  - Lembrar o último deck escolhido (ex.: `save.loadout`) pra não ter que montar toda vez
  - Os iniciais (Hacker, Golem, Pinguim, Honeypot...) já vêm no arsenal; o tutorial (1-1) e a
    platina (aliado bloqueado) continuam funcionando com o deck
  - Os bots (`tools/sim/bot.js`) escolhem o deck pelo perfil

## Executivo (comandante)

- [ ] **Poder do nível 2: chamar algo cyber pelo caminho** (tipo o comandante do Tower Defense
  Simulator, que chama um veículo). Pago a cada chamada, sai da base e anda pelo caminho ao
  contrário com uma vida própria, segurando e acertando os vírus até a vida acabar (um Honeypot
  andando). Ideia testada e tirada por enquanto: **Lixeira Turbo** (a lixeira do sistema rolando
  e deletando vírus) — o código está no commit `e84f976` (`src/entities/Bin.js`, `src/render/bin.js`).
  Outras ideias: Cavalo de Troia do bem, trem de fibra óptica
- [ ] **8º personagem** pra fechar o painel em 4 linhas. Ideia testada e tirada: **Script Kiddie**
  (joga Zip Bombs que explodem em área), também no commit `e84f976`

## Dark Net

- [x] **Árvore de upgrades, fase 1**: nó central (Acesso Root) + 1 ramo por defesa
  (`TREE` em `src/data/darknet.js`, tela em `src/scenes/DarkNetScene.js`)
- [ ] **Árvore, fase 2**: próximos nós saindo de cada ramo (os "?" na tela). Seguir o estilo RNG
  ("X tem Y% de chance de Z"; campos `*Chance` lidos em `entities/Tower.js`, `Projectile.js`, `Enemy.js`). Basta adicionar em
  `TREE` com `parent: '<id do ramo>'` e posicionar o nó em `DarkNetScene.layout()`

## Balanceamento

- [x] Recalibrar os mapas com os bots (`node tools/sim/calibrate.js` e conferir com `run.js`)
  depois das mudanças no Hacker (sem pierce) e no Honeypot (dura 15 s)
