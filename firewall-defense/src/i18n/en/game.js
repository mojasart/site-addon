// Inglês: textos da interface (chave = texto em português, igual ao do código)
export default {
  // ── Anúncios no fim da partida (dobrar café, reviver) ──
  'DOBRAR': 'DOUBLE',
  '✔ CAFÉ x2': '✔ COFFEE x2',
  'REVIVER': 'REVIVE',
  'REVIVEU!': 'REVIVED!',
  '+{n} vidas · vírus congelados': '+{n} lives · viruses frozen',
  'Assista um anúncio e volte com {n} vidas': 'Watch an ad to come back with {n} lives',

  // ── partida (game.js): faixas, avisos e textos flutuantes ──
  'MODO PLATINA': 'PLATINUM MODE',
  '{tower} bloqueado · chefão depois da onda {n}': '{tower} locked · boss after wave {n}',
  '5 minutos com ${money}: vírus não dão dinheiro!': '5 minutes with ${money}: viruses give no money!',
  'Arraste as defesas pro mapa!': 'Drag defenses onto the map!',
  'COMBO PERDIDO': 'COMBO LOST',
  'PLATINA INFINITA': 'ENDLESS PLATINUM',
  'Ondas sem fim: até onde você aguenta?': 'Endless waves: how long can you last?',
  'CHEFÃO!': 'BOSS!',
  'Derrote ele pra ganhar a platina': 'Beat it to get Platinum',
  'ÚLTIMA RODADA!': 'FINAL ROUND!',
  'Derrote a Cicada 3301 pra vencer': 'Beat Cicada 3301 to win',
  'RODADA {n} COMPLETA!': 'ROUND {n} CLEAR!',
  'Acabe com a rodada {n} primeiro!': 'Finish round {n} first!',
  'PERIGO! Velocidade normal': 'DANGER! Normal speed',
  'Juros: +${n}': 'Interest: +${n}',
  'ONDA {n}': 'WAVE {n}',
  'RODADA {n}': 'ROUND {n}',
  'Chamou antes: +${n}': 'Called early: +${n}',
  'NOVA AMEAÇA NO CATÁLOGO: {name}': 'NEW THREAT IN CATALOG: {name}',
  'Sem dinheiro!': 'No money!',
  'CRIPTOGRAFADO!': 'ENCRYPTED!',
  'Bloqueado!': 'Locked!',
  'Máx. {n}!': 'Max {n}!',
  'Máx. {n} comandantes!': 'Max {n} commanders!',
  'Só no caminho!': 'Path only!',
  'Aqui não dá!': "Can't go here!",
  'Coloque no quadrado indicado!': 'Place it on the marked tile!',
  // aba ITENS
  'Na platina não dá pra usar itens': "Items can't be used in Platinum",
  'Sem {item}! Compre na LOJA, na tela de mapas': 'No {item}! Buy it in the SHOP, on the maps screen',
  'a próxima defesa sai de graça': 'next defense is free',
  'vírus congelados': 'viruses frozen',
  'vida': 'life',
  'vidas': 'lives',
  'usado': 'used',
  'Já tem uma defesa grátis esperando': 'A free defense is already waiting',
  'Nenhum vírus pra congelar': 'No viruses to freeze',
  'No Bug Bounty é só o orçamento': 'Bug Bounty is budget only',
  'Agora não dá pra usar': "Can't use it now",

  // ── vírus e efeitos (entities/Enemy.js, systems/Effects.js) ──
  'ESMAGADO!': 'CRUSHED!',
  'BLOQ!': 'BLOCK!',

  // ── compras e anúncios (app.js, pay.js) ──
  'Pagamento em análise: os cafés chegam quando ele for aprovado': 'Payment under review: coffees arrive once it is approved',
  'O pagamento não foi concluído': 'The payment was not completed',
  'COMPRA CONFIRMADA: {list}': 'PURCHASE CONFIRMED: {list}',
  'Pagamento recebido! Se os cafés não aparecerem, abra o jogo de novo em alguns minutos': "Payment received! If the coffees don't show up, reopen the game in a few minutes",
  'Abrindo o pagamento...': 'Opening payment...',
  'Não deu pra abrir o pagamento. Confira a internet e tente de novo': "Couldn't open payment. Check your connection and try again",
  'Assista até o fim pra ganhar': 'Watch to the end to earn it',
  '+{n} cafés': '+{n} coffees',
  'MODO VIP ativado': 'VIP MODE on',

  // ── tutorial (systems/tutorial.js) ──
  'Ei, {name}! Eu sou o Fraguinha. Comprei um curso de hacker de 7 dias e agora sou o top 1 do mundo.':
    "Hey, {name}! I'm Fraguinha. I bought a 7-day hacker course and now I'm the world's #1.",
  'Uns vírus descobriram o nosso servidor e vão tentar invadir. A gente tem que defender a base!':
    "Some viruses found our server and they're trying to break in. We have to defend the base!",
  'Eles entram pelo portal e seguem o caminho até o servidor. Cada vírus que chega lá tira vidas da gente.':
    'They come through the portal and follow the path to the server. Every virus that gets there costs us lives.',
  'Agora toque num quadrado perto do caminho pra me colocar lá.': 'Now tap a tile near the path to place me there.',
  'Toque em mim ali na loja de DEFESAS.': 'Tap me over there in the DEFENSES shop.',
  'Boa! Quando estiver pronto, toque em INICIAR pra soltar a primeira onda de vírus.':
    "Nice! When you're ready, tap START to send the first wave of viruses.",
  'Tá devagar? Toque aqui pra acelerar. Cada toque deixa o jogo mais rápido.':
    'Too slow? Tap here to speed up. Each tap makes the game faster.',
  'Mandou bem na primeira onda, {name}! Dá pra deixar as defesas mais fortes. Toque em mim lá no mapa.':
    'Great first wave, {name}! You can make defenses stronger. Tap me on the map.',
  'Esses são os meus upgrades. Toque no primeiro pra comprar: vou arremessar mais rápido!':
    "These are my upgrades. Tap the first one to buy it: I'll throw faster!",
  'Cada defesa tem 2 upgrades. Quanto mais forte, mais vírus ela segura!':
    'Each defense has 2 upgrades. The stronger it is, the more viruses it holds off!',
  'Olha o tamanho dessa onda! O Honeypot é uma isca: ele vai EM CIMA do caminho, pertinho de mim. Os vírus param pra morder o pote e eu acerto todos eles!':
    'Look at the size of this wave! The Honeypot is bait: it goes ON the path, right next to me. Viruses stop to bite the pot and I hit them all!',
  'Coloque o pote no caminho, aqui do meu lado, bem na frente dos vírus!':
    'Put the pot on the path, right next to me, in front of the viruses!',
  'Toque no Honeypot na loja.': 'Tap the Honeypot in the shop.',
  'Última dica: na aba ITENS ficam os consumíveis que você compra na LOJA. Toma um Bitcoin Extra de presente!':
    "Last tip: the ITEMS tab holds the consumables you buy in the SHOP. Here's an Extra Bitcoin on me!",
  'Toque em ITENS.': 'Tap ITEMS.',
  'Agora toque no Bitcoin Extra pra usar. Ele dá dinheiro na hora!': 'Now tap the Extra Bitcoin to use it. It gives you money right away!',
  'Mais uma! Volta em DEFESAS que eu quero te apresentar um amigo.': 'One more! Go back to DEFENSES, I want you to meet a friend.',
  'Esse é o Golem Firewall. Eu acerto um vírus por vez, ele acerta vários de uma vez só. Toque nele.':
    'This is the Firewall Golem. I hit one virus at a time, he hits a bunch at once. Tap him.',
  'grmmm grmm mim gostar de regra ALL ALL': 'grmmm grmm me like rule ALL ALL',
  'Coloque o Golem perto do caminho: ele bate no chão e queima todo vírus em volta. Dano em área!':
    'Place the Golem near the path: he smashes the ground and burns every virus around. Area damage!',
  'Toque no Golem Firewall na loja.': 'Tap the Firewall Golem in the shop.',
  'Tá vendo essas pilhas de bitcoin no chão? Elas dão dinheiro! Toma {n} bitcoins pra comprar o Minerador.':
    'See those bitcoin piles on the ground? They make money! Take {n} bitcoins to buy the Miner.',
  'Coloque o Minerador EM CIMA da pilha de bitcoin. Fora dela ele não minera!':
    "Place the Miner ON the bitcoin pile. Off it, he won't mine!",
  'Toque no Minerador na loja.': 'Tap the Miner in the shop.',
  'Agora toda rodada ele minera bitcoins pra você comprar mais defesas. Cada pilha aguenta um Minerador!':
    'Now every round he mines bitcoins so you can buy more defenses. Each pile fits one Miner!',
  'E não é só a gente: mais pra frente aparecem outros personagens pra defender o servidor. Fica de olho!':
    "And it's not just us: later on, other characters show up to defend the server. Stay tuned!",
  'Mandou bem, {name}! Agora é com você: segura os vírus até a última onda. Boa sorte!':
    "Well done, {name}! Now it's up to you: hold off the viruses until the last wave. Good luck!",
  'Onda infinita {n}': 'Endless wave {n}',
};
