# Firewall Defense

Tower defense para celular no estilo **Bloons TD**, com tema de segurança digital.
Os vírus andam por um caminho numa placa-mãe até o **servidor**; você espalha
**antivírus, firewalls, criptografia e scanners** pelo mapa pra estourar eles antes.

## Como rodar

HTML5 Canvas + JavaScript puro (ES modules). Não tem build nem dependências,
mas precisa ser servido por HTTP (abrir o `index.html` direto do disco não funciona por causa dos módulos).

```bash
cd firewall-defense
python3 -m http.server 8080
# ou: npx serve .
```

- **No computador:** `http://localhost:8080`
- **No celular:** mesma rede Wi-Fi, abra `http://IP-DO-SEU-PC:8080`
- **Modo debug:** `?debug` no final do endereço (dinheiro infinito). O objeto `game` fica exposto no console.

## Como jogar

- **Arraste** uma defesa do painel até o mapa (ou toque nela e depois no mapa). Fora do caminho e dos componentes da placa.
- O **Honeypot** é o contrário: só pode ir **em cima** do caminho.
- Toque numa defesa colocada para ver **upgrades**, trocar o **alvo** (primeiro, último, mais forte, mais perto) ou **vender** (devolve 70%).
- **INICIAR** começa a rodada; durante a rodada o mesmo botão acelera (1x → 2x → 3x).
- O **Minerador** solta pacotes de `$` durante as rodadas: toque (ou passe o dedo) neles.
- Cada camada de vírus estourada dá $1; cada rodada completa dá um bônus.

## Defesas

| Defesa | Custo | O que faz | Upgrades |
| --- | --- | --- | --- |
| **Antivírus** | $200 | Atira varreduras (atravessa 2 vírus) | Varredura Rápida · Heurística (fura blindagem) |
| **Firewall** | $300 | Onda de fogo em volta, queima blindados | Chamas Intensas · Muralha de Fogo |
| **Criptografia** | $300 | Deixa os vírus em volta lentos | AES-256 · Quebra de Chave (passa a dar dano) |
| **Scanner** | $350 | Laser que alcança o mapa todo | Alta Precisão · Varredura Contínua |
| **Honeypot** | $45 | Armadilha no caminho, estoura 12 e some | — |
| **Minerador** | $450 | Gera pacotes de $ nas rodadas | GPU Extra · Fazenda de Mineração |

## Ameaças

Os vírus funcionam como os balões do Bloons: cada camada estourada revela a de baixo.

| Ameaça | Detalhe |
| --- | --- |
| **Vírus** vermelho → azul → verde → amarelo → rosa | Cada cor é uma camada a mais e é mais rápida |
| **Worm** | Se replica: solta 2 vírus verdes |
| **Trojan** | Blindado. Varredura comum não fura; precisa de fogo, laser, honeypot ou Heurística |
| **Ransomware** | Chefão da rodada 20 (400 de vida). Solta 4 Trojans |

## Estrutura

```
firewall-defense/
├── index.html               página + meta tags de app mobile + fonte
├── style.css                tela cheia, aviso "gire o celular"
├── manifest.webmanifest     PWA (instalar na tela inicial)
└── src/
    ├── main.js              canvas, escala da tela, input touch, loop
    ├── game.js              estado do jogo, regras, toque, desenho geral
    ├── config.js            tela, economia, fonte, cores base
    ├── data/                ← BALANCEAMENTO FICA AQUI
    │   ├── towers.js        custo, alcance, dano, upgrades de cada defesa
    │   ├── enemies.js       camadas, velocidade, blindagem dos vírus
    │   ├── rounds.js        as 20 rodadas
    │   └── map.js           o caminho do mapa
    ├── core/Path.js         caminho (posição pela distância percorrida)
    ├── entities/            Tower, Enemy, Projectile, Packet
    ├── systems/             RoundManager (rodadas), Effects (POP, ondas, laser)
    └── render/              sprites, mapa (com cache), painel/HUD, telas
```

## Como estender

- **Nova defesa:** entrada em `src/data/towers.js` com um `attack` existente (`projectile`, `pulse`, `beam`, `trap`, `farm`), desenho em `TOWER_SPRITES` (`src/render/sprites.js`) e o id em `TOWER_ORDER`.
- **Novo vírus:** entrada em `src/data/enemies.js` (diga quais `children` ele solta ao estourar) e, se quiser um desenho próprio, um `kind` novo em `drawEnemy`.
- **Novo mapa:** troque os `points` em `src/data/map.js` (o primeiro trecho tem que entrar pela esquerda). A decoração da placa se ajusta sozinha; mude a `seed` pra sortear outra.
- **Arte de verdade:** os sprites são desenhados com formas em `src/render/sprites.js`, centrados em (0,0). Dá pra trocar cada função por `ctx.drawImage(...)` sem mexer no resto.

## Próximos passos sugeridos

- [ ] Sons (estouro, tiro, rodada) com Web Audio
- [ ] Mais mapas + tela de seleção + salvar progresso (`localStorage`)
- [ ] Caminhos de upgrade em 2 trilhas (como o Bloons 6) e mais níveis
- [ ] Heróis (ex.: um "Hacker" que sobe de nível sozinho)
- [ ] Vírus camuflado (Rootkit) que só o Scanner enxerga
- [ ] Modos de dificuldade (fácil/médio/difícil)
- [ ] Empacotar como app Android/iOS com [Capacitor](https://capacitorjs.com/) (`npx cap add android`)
