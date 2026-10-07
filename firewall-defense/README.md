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
- Defesas de terra não vão no caminho, na água nem em cima dos componentes (chips, racks, coqueiros...).
- O **Pescador** só vai na **água**. O **Honeypot** só vai **em cima do caminho**.
- Toque numa defesa colocada para ver **upgrades**, trocar o **alvo** ou **vender** (devolve 70%).
- **INICIAR** começa a rodada; durante a rodada o mesmo botão acelera (1x → 2x → 3x).
- Cada camada de vírus estourada dá $1, e cada rodada completa dá um bônus.
- Ao vencer você ganha de 1 a 3 estrelas (3 = não perdeu nenhuma vida), e o próximo mapa é liberado.

## Defesas

| Defesa | Custo | O que faz | Upgrades |
| --- | --- | --- | --- |
| **Hacker** | $200 | Arremessa dardos (atravessa 2 vírus) | Dedos Rápidos · Exploit Triplo |
| **Roteador** | $320 | Espalha 8 pacotes pra todos os lados | Wi-Fi 6 · Rede Mesh |
| **Golem Firewall** | $350 | Onda de fogo em volta, queima blindados | Chamas Intensas · Muralha de Fogo |
| **Pinguim** | $300 | Congela os vírus em volta (lentidão) | Criptografia AES · Era do Gelo |
| **Engenheiro** | $500 | Bombas lógicas com dano em área | Bomba Maior · Fragmentação |
| **Robô Scanner** | $380 | Laser que alcança o mapa todo | Alta Precisão · Varredura Contínua |
| **Pescador** | $400 | *Só na água.* Fisga vírus e puxa pra trás | Anzol Duplo · Rede de Pesca |
| **Sysadmin** | $650 | Acelera as defesas por perto | Café Duplo · Acesso Root (furam blindagem) |
| **Minerador** | $650 | Minera moedas que vão direto pro saldo | GPU Extra · Fazenda de Mineração |
| **Honeypot** | $80 | *Só no caminho.* Estoura 6 vírus e some | — |

## Ameaças

Os vírus funcionam como os balões do Bloons: cada camada estourada revela a de baixo.

| Ameaça | Detalhe |
| --- | --- |
| **Vírus** vermelho → azul → verde → amarelo → rosa | Cada cor é uma camada a mais e é mais rápida |
| **Worm** | Se replica: solta 2 vírus verdes |
| **Trojan** | Blindado: dardos e pacotes não furam |
| **Locker** | Mini-chefão acorrentado (rodadas 15+). Solta 2 Trojans |
| **Ransomware** | Chefão dirigível (rodadas 20 e 25). Solta 4 Trojans |

## Mapas

| Mapa | Dificuldade | Rodadas | Zona especial |
| --- | --- | --- | --- |
| **Placa-Mãe** | Fácil | 15 | — |
| **Data Center** | Médio | 20 | Piscinas de refrigeração (água) |
| **Cabo Submarino** | Difícil | 25 | Mar aberto com ilhas (pouca terra) |

## Estrutura

```
firewall-defense/
├── index.html               página + meta tags de app mobile + fonte
├── style.css                tela cheia, aviso "gire o celular"
├── manifest.webmanifest     PWA (instalar na tela inicial)
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
    │   └── maps.js          mapas: caminho, zonas de água/terra, dificuldade
    ├── audio/Sound.js       efeitos e música (sintetizados, sem arquivos)
    ├── core/                caminho e terreno
    ├── entities/            Tower, Enemy, Projectile, Packet
    ├── systems/             RoundManager, Effects (POP, ondas, confete)
    ├── scenes/              TitleScene, LevelSelectScene
    └── render/
        ├── characters.js    os personagens (defesas)
        ├── viruses.js       os vírus
        ├── sprites.js       moedas, servidor, projéteis, ícones
        ├── ui.js            HUD e painel lateral
        ├── screens.js       pausa, vitória, derrota
        ├── widgets.js       botões, estrelas, fita de título
        └── maps/            temas de mapa (placa-mãe, data center, oceano)
```

## Como estender

- **Nova defesa:** entrada em `src/data/towers.js` (escolha um `attack`), desenho em `CHARACTERS` (`src/render/characters.js`) e o id em `TOWER_ORDER`. Use `terrain: 'water'` pra defesas de água.
- **Novo vírus:** entrada em `src/data/enemies.js` (diga quais `children` ele solta) e, se quiser visual próprio, um `kind` novo em `src/render/viruses.js`.
- **Novo mapa:** objeto em `src/data/maps.js` com `points` (caminho), `zones` (água/terra) e um `theme`. Pra um visual novo, crie um arquivo em `src/render/maps/` com `layout`, `paint` e `animate`.
- **Arte de verdade:** cada personagem/vírus é uma função de desenho centrada em (0,0). Dá pra trocar por `ctx.drawImage(...)` de um spritesheet sem mexer no resto.

## Próximos passos sugeridos

- [ ] Caminhos de upgrade em 2 trilhas (como o Bloons 6) e mais níveis
- [ ] Heróis que sobem de nível durante a partida
- [ ] Vírus camuflado (Rootkit) que só o Scanner enxerga
- [ ] Modos de dificuldade por mapa
- [ ] Spritesheets desenhados à mão
- [ ] Empacotar como app Android/iOS com [Capacitor](https://capacitorjs.com/) (`npx cap add android`)
