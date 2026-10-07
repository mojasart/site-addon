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
- As defesas não vão no caminho, na água nem em cima dos componentes (chips, racks, coqueiros...).
- O **Honeypot** só vai **em cima do caminho**.
- Toque numa defesa colocada para ver **upgrades**, trocar o **alvo** ou **vender** (devolve 70%).
  O que você comprou **antes de a rodada começar** volta pelo preço cheio (pra mudar de lugar se errou).
- **INICIAR** começa a primeira rodada; o botão do lado acelera (1x → 2x → 3x).
- Quando o mapa limpa, a próxima rodada começa **sozinha em 10 s**.
- Dá pra **chamar a próxima rodada com outra ainda rolando** (no máximo 2 ao mesmo tempo: a 3 só
  depois de acabar com a 1). Isso dá um **bônus** de 15% do dinheiro que os vírus da próxima rodada valem.
- Cada camada de vírus estourada dá $1, e cada rodada completa dá um bônus.
- Ao vencer você ganha de 1 a 3 estrelas (3 = não perdeu nenhuma vida), e o próximo mapa é liberado.

## Defesas

| Defesa | Custo | O que faz | Upgrades |
| --- | --- | --- | --- |
| **Hacker** | $200 | Arremessa teclados (1 vírus por teclado) | Dedos Rápidos · Exploit Triplo |
| **Golem Firewall** | $350 | Onda de fogo em volta, queima blindados | Muralha de Fogo (mais alcance e ondas mais rápidas) · Incêndio (vírus pegam fogo: 1 de dano/s por 3 s, mesmo fora do alcance) |
| **Penguin Linux** | $300 | Suporte: não dá dano, congela os vírus em volta (lentidão) | Criptografia AES · Era do Gelo (mais alcance e congelados ficam vulneráveis: levam dano dobrado) |
| **Robô NMAP** | $450 | Laser de longo alcance: tiro lento, dano alto, fura blindagem | Alta Precisão (+3 de dano) · Varredura Contínua (40% mais rápido) |
| **Minerador** | $650 | Minera bitcoins que vão direto pro saldo | GPU Extra · Fazenda de Mineração (+$120 a cada rodada nova) |
| **Honeypot** | $80 | *Só no caminho.* Isca: não dá dano; os vírus param pra atacar até a vida dela (40) acabar. Dura no máximo 15 s: nas rodadas vai gastando sozinha, e mais rápido com vírus mordendo | — |

## Ameaças

Os vírus funcionam como os balões do Bloons: cada camada estourada revela a de baixo.

| Ameaça | Detalhe |
| --- | --- |
| **Vírus** vermelho → azul → verde → amarelo → rosa | Cada cor é uma camada a mais e é mais rápida |
| **Worm** | Rápido: vai soltando vírus azuis pelo caminho enquanto está vivo |
| **Trojan** | Blindado: os teclados do Hacker não furam |
| **Locker** | Mini-chefão acorrentado (rodadas 15+). Solta 2 Trojans |
| **Ransomware** | Chefão dirigível (rodadas 20 e 25). Solta 4 Trojans |

## Catálogo de ameaças

Na escolha de mapa, o ícone do monitor (canto de cima) abre o `THREAT_DB.EXE`: um computador com terminal verde listando os vírus. Cada ameaça entra no catálogo na primeira vez que aparece numa fase (avisa no topo: *NOVA AMEAÇA NO CATÁLOGO*). As que ainda não apareceram ficam como silhueta com cadeado. A ficha mostra vida, dano (vidas que tira se chegar no servidor), velocidade, faixa de dinheiro (da 1ª camada até destruir tudo o que ele solta), o que ele solta e uma frase (`lore` em `src/data/enemies.js`).

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
node tools/sim/run.js            # taxa de vitória dos bots em cada mapa
node tools/sim/calibrate.js      # recalibra a pressão de cada mapa (grava src/data/tuning.js)
```

Mexeu em defesas, rodadas ou mapas? Rode `calibrate.js` de novo e confira com `run.js`.

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
    ├── save.js              estrelas e configurações no localStorage
    ├── config.js            tela, regras globais, fonte, cores base
    ├── data/                ← BALANCEAMENTO E CONTEÚDO FICAM AQUI
    │   ├── towers.js        defesas, custos, upgrades
    │   ├── enemies.js       vírus, camadas, chefões
    │   ├── rounds.js        as 25 rodadas
    │   ├── maps.js          seasons e os 45 mapas (dificuldade de cada um)
    │   ├── mapgen.js        gerador de caminhos (loop, Y, várias entradas)
    │   └── tuning.js        pressão de cada mapa, calibrada com bots
    ├── audio/Sound.js       efeitos e música (sintetizados, sem arquivos)
    ├── core/                caminho e terreno
    ├── entities/            Tower, Enemy, Projectile, Packet
    ├── systems/             RoundManager, Effects (POP, ondas, confete)
    ├── scenes/              TitleScene, LevelSelectScene
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

- [ ] **Spyware**: vírus invisível, que só uma defesa específica consegue enxergar
- [ ] **Adware**
- [ ] Caminhos de upgrade em 2 trilhas (como o Bloons 6) e mais níveis
- [ ] Heróis que sobem de nível durante a partida
- [ ] Modos de dificuldade por mapa
- [ ] Sprites pras defesas que ainda usam desenho com formas (Honeypot)
- [ ] Empacotar como app Android/iOS com [Capacitor](https://capacitorjs.com/) (`npx cap add android`)
