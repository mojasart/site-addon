# Firewall Defense

Tower defense para celular no estilo **Bloons TD**, com tema de segurança digital.
Os vírus andam por um caminho até o **servidor**; você espalha personagens cartoon
(hacker, golem de firewall, pinguim, robô...) pelo mapa pra estourar eles antes.

## Como rodar

HTML5 Canvas + JavaScript puro (ES modules). Não tem build nem dependências,
mas precisa ser servido por HTTP (abrir o `index.html` direto do disco não funciona por causa dos módulos).

```bash
cd firewall-defense
python3 -m http.server 8080
# ou: npx serve .
```

- **No computador:** `http://localhost:8080` (Espaço = iniciar/acelerar, Esc = pausar)
- **No celular:** mesma rede Wi-Fi, abra `http://IP-DO-SEU-PC:8080`
- **Modo debug:** `?debug` no final do endereço (dinheiro infinito e todos os mapas liberados). O objeto `app` fica exposto no console.

## Como jogar

- **Arraste** uma defesa do painel até o mapa (ou toque nela e depois no mapa).
- O mapa é uma **grade de 14×10 quadrados** (54 px). Cada defesa ocupa **exatamente 1 quadrado** (uma por quadrado),
  fora do caminho, da água, do servidor e dos componentes que bloqueiam (resistores). Ao arrastar, o quadrado
  de destino fica verde (pode) ou vermelho (não pode).
- O **Honeypot** só vai **em cima do caminho**.
- Ao escolher uma defesa na loja ou tocar numa colocada, aparece uma **aba de informações** do lado do
  mapa: o que ela faz, dano, alcance, recarga, se fura blindagem e o próximo upgrade. A alça do lado
  recolhe e abre a aba (o jogo lembra a escolha).
- Toque numa defesa colocada para ver **upgrades**, trocar o **alvo** ou **vender** (devolve 70%).
  O **alvo** (Hacker e Robô NMAP) alterna entre: primeiro, último, mais forte (o que tira mais vidas
  se chegar), mais vida (maior vida máxima), mais rápido e mais perto.
  O que você comprou **antes de a rodada começar** volta pelo preço cheio (pra mudar de lugar se errou).
- **INICIAR** começa a primeira rodada; o botão do lado acelera (1x → 2x → 3x).
- Com o **turno automático** ligado (menu de pausa), a próxima rodada começa na hora, assim que o mapa limpa.
- Dá pra **chamar a próxima rodada com outra ainda rolando** (no máximo 2 ao mesmo tempo: a 3 só
  depois de acabar com a 1). Isso dá um **bônus** de até 15% do dinheiro que os vírus da próxima rodada
  valem, que vai diminuindo conforme os vírus da rodada atual morrem (com 1 sobrando, é só $1).
- Cada camada de vírus estourada dá $1, e cada rodada completa dá um bônus.
- Ao vencer você ganha de 1 a 3 estrelas (3 = terminou com 90% das vidas ou mais; 2 = pelo menos metade), e o próximo mapa é liberado.
  As estrelas do mapa ficam de **bronze** (1), **prata** (2) ou **ouro** (3).

### Modo platina

Tocar num mapa abre a escolha **NORMAL** / **PLATINA** (`src/data/platinum.js`); a platina só libera com **3 estrelas** (antes disso aparece trancada):

- As ondas vêm **uma atrás da outra**, sem esperar o mapa limpar, por **3 minutos** (o relógio fica no HUD).
  O bônus de cada onda vem quando ela começa.
- Aos 3:00 vem o **chefão** (Locker nos mapas 1–5 da season, Ransomware nos 6–10 e Ransomware com
  Lockers nos 11–15). Derrotou, ganhou a platina: as estrelas do mapa ficam **azul-gelo** e o
  card da fase vira **prata azulado metálico**.
- Cada mapa tem um **aliado bloqueado** (sorteado pelo mapa, sempre o mesmo). Ele só aparece dentro
  da partida: no aviso do começo e trancado no painel.

## Defesas

| Defesa | Custo | O que faz | Upgrades |
| --- | --- | --- | --- |
| **Hacker** | $250 | Arremessa teclados (1 vírus por teclado) | Dedos Rápidos (mais rápido e atravessa 2 vírus) · Exploit Triplo |
| **Golem Firewall** | $350 | Onda de fogo em volta, queima blindados | Muralha de Fogo (mais alcance e ondas mais rápidas) · Incêndio (vírus pegam fogo: 0,33 de dano/s por até 3 s, mesmo fora do alcance; não acumula nem renova enquanto queima) |
| **Penguin Linux** | $250 | Suporte: não dá dano, congela os vírus em volta (lentidão) | Criptografia AES · Era do Gelo (mais alcance e congelados ficam vulneráveis: levam dano dobrado) |
| **Robô NMAP** | $500 | Laser de longo alcance: tiro lento, dano alto, fura blindagem | Feixe Perfurante (o laser atravessa e acerta até 2 vírus em linha) · Varredura Contínua (40% mais rápido) |
| **Minerador** | $650 | Minera bitcoins que vão direto pro saldo. Nas seasons 1 e 2 só minera **em cima de uma pilha de bitcoin** (ver abaixo) | GPU Extra · Toque de Midas (5% dos vírus que entram vêm **dourados**: destruídos, soltam $100) |
| **Honeypot** | $90 | *Só no caminho.* Isca: não dá dano; os vírus param pra atacar até a vida dela (40) acabar. Dura no máximo 15 s: nas rodadas vai gastando sozinha, e mais rápido com vírus mordendo | — |

### Pilhas de bitcoin (Minerador)

Na **Placa-Mãe** e no **Data Center**, cada mapa tem de **1 a 4 quadrados no chão com uma pilha de bitcoin** (`src/core/coinTiles.js`, sorteados pela semente do mapa, sempre os mesmos). O Minerador **só minera em cima de uma pilha**, um Minerador por pilha; fora delas ele fica parado ("z" em cima dele) e o painel avisa. Enquanto se arrasta um Minerador, as pilhas piscam em dourado. No **Cabo Submarino** ainda minera em qualquer lugar (vai precisar de um upgrade: ver `TODO.md`).

Se a rodada acabar antes de ele soltar todos os bitcoins, os que faltaram saem na hora.

## Ameaças

Os vírus funcionam como os balões do Bloons: cada camada estourada revela a de baixo.

| Ameaça | Detalhe |
| --- | --- |
| **Vírus** vermelho → azul → verde → amarelo → rosa | Cada cor é uma camada a mais e é mais rápida |
| **Worm** | Rápido: vai soltando vírus azuis pelo caminho enquanto está vivo |
| **Spyware** | Invisível: só aparece (e leva dano) no alcance de um Robô NMAP. Passa reto pelo Honeypot |
| **Trojan** | Blindado: os teclados do Hacker não furam |
| **Locker** | Mini-chefão acorrentado (rodadas 15+). Solta 2 Trojans |
| **Ransomware** | Chefão dirigível (rodadas 20 e 25). Criptografa a defesa mais perto por 5 s (toque nela e pague o resgate pra destravar na hora). Solta 4 Trojans |

## Catálogo de ameaças

Na escolha de mapa, o ícone do monitor (canto de cima) abre o `THREAT_DB.EXE`: um computador com terminal verde listando os vírus. Cada ameaça entra no catálogo na primeira vez que aparece numa fase (avisa no topo: *NOVA AMEAÇA NO CATÁLOGO*). As que ainda não apareceram ficam como silhueta com cadeado. A ficha mostra vida, dano (vidas que tira se chegar no servidor), velocidade, faixa de dinheiro (da 1ª camada até destruir tudo o que ele solta), o que ele solta e uma frase (`lore` em `src/data/enemies.js`).

## Dark Net e cafés

Na escolha de mapa, a cebola roxa (ao lado do catálogo) é a **Dark Net**: uma árvore de upgrades paga com **cafés**. Ela libera com **35 estrelas** somadas em todos os mapas; antes disso o botão fica trancado e avisa quantas faltam. O saldo de cafés aparece lá dentro.

A árvore começa num nó central, que abre um ramo por defesa. Cada nó é um bônus permanente (vale em toda fase, normal e platina), comprado uma vez (`TREE` em `src/data/darknet.js`, salvo em `save.darknet`):

| Nó | Efeito | Custo |
|----|--------|-------|
| Acesso Root (centro) | toda fase começa com +$75; libera os ramos | 3 cafés |
| Teclado Mecânico | Hacker ataca 10% mais rápido | 5 cafés |
| Tijolo Refratário | Golem Firewall com +15% de alcance | 5 cafés |
| Kernel Gelado | lentidão do Penguin Linux dura +0,5 s | 5 cafés |
| Lente Calibrada | Robô NMAP com +1 de dano | 5 cafés |
| Overclock | cada bitcoin minerado vale +$5 | 5 cafés |
| Mel Turbinado | Honeypot com +50% de vida | 5 cafés |

Os bots jogam sem esses bônus, então a dificuldade calibrada é a de quem ainda não comprou nada.

Os cafés vêm do melhor resultado de cada mapa (`src/data/darknet.js`), então nunca se ganha o mesmo café duas vezes:

| Resultado no mapa | Cafés |
| --- | --- |
| Pelo menos 1 estrela | 1 |
| 3 estrelas | 2 (quem já tinha 1 ganha só mais 1) |
| Platina | +2 |

Além disso, **cada monstro abatido vale café**: 0,25 café a cada 1000 abatidos, ou seja 0,25 / 1000 = **0,00025 por monstro** (cada camada estourada conta, em qualquer partida, até nas derrotas). O total de abatidos fica no save (`kills`) e é somado no fim da partida ou ao sair dela.

A tela de vitória mostra os cafés novos da partida (ex.: *+2,1*: 2 das estrelas e 0,1 dos abatidos). O save guarda os cafés gastos (`coffeeSpent`); o saldo é o que ganhou menos o que gastou, com até 2 casas.

## Seasons e mapas

São **3 seasons de 15 mapas** (45 fases), numa ordem só de dificuldade. Vencer um mapa libera o próximo, e a season seguinte abre ao vencer o último mapa da anterior.

| Season | Mapas | Rodadas | Especial |
| --- | --- | --- | --- |
| **Placa-Mãe** | 1-1 a 1-15 | 12 → 18 | — |
| **Data Center** | 2-1 a 2-15 | 15 → 22 | Zonas eletrificadas: a cada 8 s dão choque e atordoam por 2,5 s as defesas em cima delas |
| **Cabo Submarino** | 3-1 a 3-15 | 18 → 25 | Mar com ilhas: só dá pra construir na terra |

Os caminhos são **gerados** (`src/data/mapgen.js`) numa grade, a partir da semente de cada mapa (sai sempre igual):

- **Loop:** o caminho cruza ele mesmo.
- **Y / várias entradas:** até 3 entradas de vírus (esquerda, cima, baixo) que se juntam num tronco até a base. Os vírus revezam entre as entradas.
- Quanto mais difícil, **menos dinheiro e vidas, caminho mais curto, mais entradas e mais vírus**. No mar, menos ilhas; no Data Center, mais zonas elétricas.

### Dificuldade calibrada com bots

A quantidade de vírus de cada mapa foi calibrada com **bots jogando todos os mapas** (`tools/sim/`, na raiz do repo). São 5 estilos de jogador (equilibrado, dano, economia, laser e aleatório), e a taxa de vitória cai de ~95% no 1-1 pra ~25% no 3-15.

```bash
node tools/sim/run.js                       # taxa de vitória dos bots em cada mapa
node tools/sim/calibrate.js                 # recalibra a pressão de cada mapa (grava src/data/tuning.js)
node tools/sim/run.js --platinum            # o mesmo, no modo platina
node tools/sim/calibrate-platinum.js        # recalibra a platina (grava src/data/platinumTuning.js)
```

O modo platina tem a própria curva: de ~60% no 1-1 a ~15% no 3-15.

O card de cada fase tem uma **bolinha de dificuldade** pela % de partidas de bots que venceram:
🟢 fácil (90–100%) · 🟡 médio (65–90%) · 🟠 hard (45–65%) · 🔴 muito difícil (25–45%) · insano (0–25%,
vermelho escuro). A janela de modo mostra a do normal e a da platina. Os números ficam em
`src/data/botStats.js` e são regerados com:

```bash
node tools/sim/run.js --seeds 10 --save              # modo normal
node tools/sim/run.js --platinum --seeds 10 --save   # modo platina
```
Mexeu em defesas, rodadas ou mapas? Rode os calibradores de novo e confira com `run.js`.

## Estrutura

```
firewall-defense/
├── index.html               página + meta tags de app mobile + fonte
├── style.css                tela cheia, aviso "gire o celular"
├── manifest.webmanifest     PWA (instalar na tela inicial)
├── assets/sprites/          PNGs gerados (vírus, defesas, servidor, moeda, coração)
└── src/
    ├── main.js              canvas, escala da tela, input touch, loop
    ├── app.js               troca de telas (título → mapas → jogo), save, som
    ├── game.js              a partida: regras, toque, desenho geral
    ├── save.js              estrelas, platinas, cafés gastos, upgrades da Dark Net e configurações no localStorage
    ├── config.js            tela, regras globais, fonte, cores base
    ├── data/                ← BALANCEAMENTO E CONTEÚDO FICAM AQUI
    │   ├── towers.js        defesas, custos, upgrades
    │   ├── enemies.js       vírus, camadas, chefões
    │   ├── rounds.js        as 25 rodadas
    │   ├── platinum.js      modo platina (ondas sem parar, chefão, aliado bloqueado)
    │   ├── darknet.js       Dark Net: estrelas pra liberar, cafés de cada mapa e a árvore de upgrades
    │   ├── maps.js          seasons e os 45 mapas (dificuldade de cada um)
    │   ├── mapgen.js        gerador de caminhos (loop, Y, várias entradas)
    │   ├── tuning.js        pressão de cada mapa, calibrada com bots
    │   ├── platinumTuning.js dificuldade da platina de cada mapa, calibrada com bots
    │   └── botStats.js      % de vitória dos bots em cada mapa (bolinha de dificuldade)
    ├── audio/Sound.js       efeitos e música (sintetizados, sem arquivos)
    ├── core/                grade de quadrados (grid.js), caminho e terreno
    ├── entities/            Tower, Enemy, Projectile, Packet
    ├── systems/             RoundManager, Effects (POP, ondas, confete)
    ├── scenes/              TitleScene, LevelSelectScene, CatalogScene, DarkNetScene
    └── render/
        ├── characters.js    os personagens (defesas)
        ├── viruses.js       os vírus
        ├── sprites.js       moedas, servidor, projéteis, ícones
        ├── images.js        carrega as sprites PNG e desenha com cache
        ├── ui.js            HUD e painel lateral
        ├── screens.js       pausa, vitória, derrota
        ├── widgets.js       botões, estrelas, fita de título
        └── maps/            temas de mapa (placa-mãe, data center, oceano)
```

## Como estender

- **Nova defesa:** entrada em `src/data/towers.js` (escolha um `attack`), desenho em `CHARACTERS` (`src/render/characters.js`) e o id em `TOWER_ORDER`. 
- **Novo vírus:** entrada em `src/data/enemies.js` (diga quais `children` ele solta) e, se quiser visual próprio, um `kind` novo em `src/render/viruses.js`.
- **Mais mapas / nova season:** adicione a season em `SEASONS` (`src/data/maps.js`); os mapas são gerados pelo `mapgen.js`. Pra um visual novo, crie um arquivo em `src/render/maps/` com `layout`, `paint` e `animate`. Depois rode `node tools/sim/calibrate.js`.
- **Sprites (PNG):** ficam em `assets/sprites/` e são geradas com o Gemini por `tools/sprites/gen.py` (na raiz do repo).
  - A chave vai num `.env` na raiz: `GEMINI_API_KEY=...` (o `.env` está no `.gitignore`, nunca commite).
  - Pra criar ou refazer uma: edite o prompt dela em `ASSETS` e rode `python tools/sprites/gen.py <nome> --force`.
    Variações (outra cor, outra pose) são geradas *editando* uma imagem base, pra ficarem idênticas
    (ex.: `virus_blue` sai do `virus_red`, `pinguim_open` do `pinguim`).
  - `python tools/sprites/preview.py saida.png` monta uma folha pra conferir o recorte.
  - Pra usar no jogo: ponha o nome em `NAMES` (`src/render/images.js`). Inimigos usam o campo `sprite` em
    `data/enemies.js`; defesas usam uma sprite com o mesmo nome do tipo (e uma pose de ataque opcional em
    `ATTACK_POSE`, `src/render/characters.js`). Tamanho e posição dos pés ficam em `SPRITE_META`/`SPRITE_LOOK`.
  - Sem a imagem, cada coisa cai no desenho antigo feito com formas.

## Próximos passos sugeridos

- [x] **Spyware**: vírus invisível, que só o Robô NMAP enxerga
- [ ] **Adware**
- [ ] Caminhos de upgrade em 2 trilhas (como o Bloons 6) e mais níveis
- [ ] Heróis que sobem de nível durante a partida
- [ ] Modos de dificuldade por mapa
- [ ] Sprites pras defesas que ainda usam desenho com formas (Honeypot)
- [ ] Empacotar como app Android/iOS com [Capacitor](https://capacitorjs.com/) (`npx cap add android`)
