# Firewall Defense

Tower defense para celular no estilo **Plants vs. Zombies**, com tema de segurança digital:
em vez de plantas, você instala **firewalls, antivírus e honeypots** nas linhas da rede para
impedir que **vírus, worms, trojans e ransomwares** cheguem ao **Núcleo**.

## Como rodar

O jogo é HTML5 Canvas + JavaScript puro (ES modules). Não tem build nem dependências,
mas precisa ser servido por HTTP (abrir o `index.html` direto do disco não funciona por causa dos módulos).

```bash
cd firewall-defense
python3 -m http.server 8080
# ou: npx serve .
```

- **No computador:** abra `http://localhost:8080`
- **No celular:** conecte na mesma rede Wi-Fi e abra `http://IP-DO-SEU-PC:8080`
- **Modo debug:** `http://localhost:8080/?debug` (5000 bits e recarga 10x mais rápida).
  O objeto `game` também fica exposto no console do navegador.

## Equivalências com Plants vs. Zombies

| PvZ               | Firewall Defense | O que faz                                                        |
| ----------------- | ---------------- | ---------------------------------------------------------------- |
| Sol               | **Bits**         | Recurso. Cai da rede e é gerado pelos Mineradores. Toque pra coletar |
| Girassol          | **Minerador**    | Gera 25 bits a cada 22s                                          |
| Ervilha           | **Antivírus**    | Atira varreduras na linha                                        |
| Noz               | **Firewall**     | Muro com 4000 de vida                                            |
| Ervilha de gelo   | **Criptografia** | Atira e deixa o inimigo 50% mais lento                           |
| Batata-mina       | **Honeypot**     | Arma em 12s e explode o primeiro que encostar                    |
| Pá                | **Deletar**      | Remove um defensor                                               |
| Cortador de grama | **Backup**       | Limpa a linha uma vez quando um inimigo chega no fim             |
| Zumbi comum       | **Vírus**        | Inimigo básico                                                   |
| Zumbi rápido      | **Worm**         | Pouca vida, muito rápido                                         |
| Cone              | **Trojan**       | Capacete espartano (armadura extra)                              |
| Balde             | **Ransomware**   | Cadeadão gigante (muita armadura)                                |

## Controles (touch)

- Toque numa **carta** e depois numa **célula**, ou **arraste** a carta até a célula
- Toque (ou passe o dedo) nos **pacotes de bits** para coletar
- Toque de novo na carta selecionada para cancelar
- O jogo pausa sozinho quando o app vai para segundo plano

## Estrutura

```
firewall-defense/
├── index.html               página + meta tags de app mobile
├── style.css                tela cheia, aviso "gire o celular"
├── manifest.webmanifest     PWA (instalar na tela inicial)
└── src/
    ├── main.js              canvas, escala da tela, input touch, loop
    ├── game.js              estado do jogo, regras, colisões, desenho geral
    ├── config.js            tamanho do tabuleiro, economia
    ├── data/                ← BALANCEAMENTO FICA AQUI
    │   ├── defenders.js     custo, vida, dano, recarga de cada defensor
    │   ├── enemies.js       vida, armadura, velocidade de cada inimigo
    │   └── levels.js        fases e ondas
    ├── entities/            Defender, Enemy, Projectile, Packet, Backup
    ├── systems/             WaveDirector (ondas), Effects (partículas)
    └── render/              sprites, tabuleiro, HUD, telas
```

## Como estender

**Novo defensor:** adicione em `src/data/defenders.js` usando um `behavior` existente
(`producer`, `shooter`, `wall`, `trap`), desenhe em `DEFENDER_SPRITES` (`src/render/sprites.js`)
e coloque o id na lista `defenders` da fase. Para um comportamento novo, crie um novo
`behavior` em `src/entities/Defender.js`.

**Novo inimigo:** adicione em `src/data/enemies.js`, desenhe em `drawEnemy`
(`src/render/sprites.js`) e use nas ondas.

**Nova fase:** adicione um objeto em `LEVELS` (`src/data/levels.js`).

**Arte de verdade:** todos os sprites são desenhados com formas em `src/render/sprites.js`,
centrados em (0,0). Dá pra trocar cada função por `ctx.drawImage(...)` sem mexer no resto.

## Próximos passos sugeridos

- [ ] Sons e música (Web Audio)
- [ ] Seleção de fases + salvar progresso (`localStorage`)
- [ ] Escolher quais cartas levar antes da fase (como no PvZ)
- [ ] Mais defensores: VPN (atira em 3 linhas), IDS (detecta invisíveis), Sandbox (prende 1 inimigo)
- [ ] Mais inimigos: Botnet (vem em bando), Rootkit (invisível), Phishing (rouba bits), DDoS (onda gigante)
- [ ] Botão de velocidade 2x
- [ ] Sprites/arte final
- [ ] Empacotar como app Android/iOS com [Capacitor](https://capacitorjs.com/) (`npx cap add android`)
