import { TOWERS } from '../data/towers.js';
import { layout } from '../render/ui.js';
import { inRect } from '../render/widgets.js';
import { TILE, COLS, ROWS, tileCenter, tileOf } from '../core/grid.js';
import { writeSave } from '../save.js';
import { Enemy } from '../entities/Enemy.js';

/* ════════════════════════════════════════════════════════════
 *  TUTORIAL (fase 1-1, modo normal, toda vez)
 *  O Hacker conta a história e uma mãozinha aponta onde tocar:
 *  posicionar uma defesa, começar a onda, acelerar, fazer upgrade, o
 *  Honeypot (numa enxurrada de vírus que o tutorial solta: o pote vai no
 *  caminho perto do Hacker, e a aula só começa quando eles estão chegando
 *  ali, pra fazer efeito na hora) e um
 *  consumível. Cada passo:
 *    say  → fala; o jogo fica parado e qualquer toque continua (who: quem
 *           fala, se não for o Hacker)
 *    do   → fala + mãozinha; só os alvos do passo respondem ao toque e o
 *           passo acaba no evento (on('place', 'hacker'), on('round')...)
 *    wait → invisível, espera uma condição (ex.: 5 s de onda)
 *  freeze: o jogo fica parado durante o passo (Game.update).
 *  Terminou: save.tutorialDone = true (só registro: ele aparece de novo).
 * ════════════════════════════════════════════════════════════ */

export const TUTORIAL_LOCKED = ['pinguim', 'scanner', 'minerador']; // na 1-1 só Hacker, Golem e Honeypot
// enxurrada da aula do Honeypot: n vírus, um a cada gap s; a aula começa quando o
// primeiro está a `near` quadrados (pelo caminho) do lugar do pote, perto do Hacker
const SWARM = { type: 'v2', n: 24, gap: 0.16, near: 3 };
// a 2ª onda do tutorial vem com WAVE2 da quantidade normal (a enxurrada já é grande)
const WAVE2 = 0.8;

export class Tutorial {
  // Só na 1-1, no normal, pra quem ainda não fez
  // Sempre na 1-1 no modo normal (mesmo pra quem já fez); na platina, nunca.
  // (bots não têm save: sem tutorial)
  static wanted(game) {
    return game.mapIndex === 0 && !game.platinum && !!game.app.save;
  }

  constructor(game) {
    this.g = game;
    this.i = 0;
    this.t = 0; // tempo no passo
    this.roundT = 0; // tempo de onda (pro passo de acelerar)
    this.done = false;
    for (const grp of game.rounds.rounds[1] ?? []) grp.count = Math.max(1, Math.round(grp.count * WAVE2));
    this.steps = [
      { kind: 'say', freeze: true, text: () => `Ei, ${this.name}! Eu sou o Fraguinha. Comprei um curso de hacker de 7 dias e agora sou o top 1 do mundo.` },
      { kind: 'say', freeze: true, text: 'Uns vírus descobriram o nosso servidor e vão tentar invadir. A gente tem que defender a base!' },
      { kind: 'say', freeze: true, text: 'Eles entram pelo portal e seguem o caminho até o servidor. Cada vírus que chega lá tira vidas da gente.' },
      {
        kind: 'do', event: ['place', 'hacker'],
        text: () => (this.g.placing === 'hacker' ? 'Agora toque num quadrado perto do caminho pra me colocar lá.' : 'Toque em mim ali na loja de DEFESAS.'),
        target: () => (this.g.placing === 'hacker' ? this.spotFor('hacker') : this.tile('hacker')),
        allow: (x, y, L) => inRect(this.tileRect(L, 'hacker'), x, y) || (this.g.placing === 'hacker' && x < L.panel.x),
      },
      {
        kind: 'do', event: ['round'], text: 'Boa! Quando estiver pronto, toque em INICIAR pra soltar a primeira onda de vírus.',
        target: () => this.rect('play'), allow: (x, y, L) => inRect(L.play, x, y),
      },
      { kind: 'wait', until: () => this.roundT > 5 },
      {
        kind: 'do', freeze: true, event: ['speed'], text: 'Tá devagar? Toque aqui pra acelerar. Cada toque deixa o jogo mais rápido.',
        target: () => this.rect('speed'), allow: (x, y, L) => inRect(L.speed, x, y),
      },
      // upgrade: acabou a 1ª onda, o Hacker ensina a comprar o 1º upgrade dele
      { kind: 'wait', until: () => this.g.rounds.done >= 1 },
      {
        kind: 'do', freeze: true, event: ['select', 'hacker'], enter: () => this.fundUpgrade('hacker'),
        text: () => `Mandou bem na primeira onda, ${this.name}! Dá pra deixar as defesas mais fortes. Toque em mim lá no mapa.`,
        target: () => this.towerSpot('hacker'), allow: (x, y, L) => x < L.panel.x,
      },
      {
        kind: 'do', freeze: true, event: ['upgrade', 'hacker'],
        text: 'Esses são os meus upgrades. Toque no primeiro pra comprar: vou arremessar mais rápido!',
        target: () => this.rect('upgrades', 0), allow: (x, y, L) => inRect(L.upgrades[0], x, y),
      },
      // (fecha o painel da defesa: a loja volta, com o Honeypot à vista)
      { kind: 'say', freeze: true, enter: () => (this.g.selectedTower = null), text: 'Cada defesa tem 2 upgrades. Quanto mais forte, mais vírus ela segura!' },
      // Honeypot: na 2ª onda, uma enxurrada de vírus; o pote vai no caminho
      // perto do Hacker e o jogo só para quando os primeiros estão chegando lá
      { kind: 'wait', until: () => this.g.rounds.active },
      { kind: 'wait', enter: () => this.startSwarm(), until: () => this.swarmClose() },
      { kind: 'say', freeze: true, enter: () => this.prepHoneypot(), text: 'Olha o tamanho dessa onda! O Honeypot é uma isca: ele vai EM CIMA do caminho, pertinho de mim. Os vírus param pra morder o pote e eu acerto todos eles!' },
      {
        kind: 'do', freeze: true, event: ['place', 'honeypot'],
        text: () => (this.g.placing === 'honeypot' ? 'Coloque o pote no caminho, aqui do meu lado, bem na frente dos vírus!' : 'Toque no Honeypot na loja.'),
        target: () => (this.g.placing === 'honeypot' ? this.honeySpot ?? this.spotFor('honeypot') : this.tile('honeypot')),
        allow: (x, y, L) => inRect(this.tileRect(L, 'honeypot'), x, y) || (this.g.placing === 'honeypot' && x < L.panel.x),
      },
      { kind: 'say', freeze: true, enter: () => this.giftItem('cash'), text: 'Última dica: na aba ITENS ficam os consumíveis que você compra na LOJA. Toma um Bitcoin Extra de presente!' },
      {
        kind: 'do', freeze: true, event: ['tab', 'items'], text: 'Toque em ITENS.',
        target: () => this.rect('tabs', 1), allow: (x, y, L) => inRect(L.tabs[1], x, y),
      },
      {
        kind: 'do', freeze: true, event: ['item', 'cash'], text: 'Agora toque no Bitcoin Extra pra usar. Ele dá dinheiro na hora!',
        target: () => this.itemRect('cash'), allow: (x, y, L) => inRect(L.items.find((r) => r.id === 'cash'), x, y),
      },
      // Golem Firewall: volta pra loja de DEFESAS e coloca o golem (dano em área)
      {
        kind: 'do', freeze: true, event: ['tab', 'towers'], enter: () => this.fund(this.g.costOf('firewall')),
        text: 'Mais uma! Volta em DEFESAS que eu quero te apresentar um amigo.',
        target: () => this.rect('tabs', 0), allow: (x, y, L) => inRect(L.tabs[0], x, y),
      },
      {
        kind: 'do', freeze: true, until: () => this.g.placing === 'firewall',
        text: 'Esse é o Golem Firewall. Eu acerto um vírus por vez, ele acerta vários de uma vez só. Toque nele.',
        target: () => this.tile('firewall'), allow: (x, y, L) => inRect(this.tileRect(L, 'firewall'), x, y),
      },
      { kind: 'say', freeze: true, who: 'firewall', text: 'grmmm grmm mim gostar de regra ALL ALL' },
      {
        kind: 'do', freeze: true, event: ['place', 'firewall'],
        text: () => (this.g.placing === 'firewall'
          ? 'Coloque o Golem perto do caminho: ele bate no chão e queima todo vírus em volta. Dano em área!'
          : 'Toque no Golem Firewall na loja.'),
        target: () => (this.g.placing === 'firewall' ? this.spotFor('firewall') : this.tile('firewall')),
        allow: (x, y, L) => inRect(this.tileRect(L, 'firewall'), x, y) || (this.g.placing === 'firewall' && x < L.panel.x),
      },
      { kind: 'say', freeze: true, text: 'E não é só a gente: mais pra frente aparecem outros personagens pra defender o servidor. Fica de olho!' },
      { kind: 'say', freeze: true, text: () => `Mandou bem, ${this.name}! Agora é com você: segura os vírus até a última onda. Boa sorte!` },
    ];
  }

  // Nome do jogador (tela de nome; sem nome, "hacker")
  get name() {
    return this.g.app.playerName ?? 'hacker';
  }

  get step() {
    return this.steps[this.i];
  }

  // O jogo para durante a fala e nos passos marcados
  get frozen() {
    return !this.done && !!this.step?.freeze;
  }

  update(dt) {
    if (this.done) return;
    this.t += dt;
    this.spawnSwarm(dt);
    if (this.g.rounds.active && !this.frozen) this.roundT += dt;
    // wait (e do com until): passa quando a condição vale
    if ((this.step.kind === 'wait' || this.step.kind === 'do') && this.step.until?.()) this.next();
  }

  next() {
    this.i++;
    this.t = 0;
    if (this.i >= this.steps.length) return this.finish();
    this.step.enter?.();
  }

  finish() {
    this.done = true;
    this.g.app.save.tutorialDone = true;
    writeSave(this.g.app.save);
  }

  // Evento do jogo (Game chama): fecha o passo "do" que estava esperando por ele
  on(name, arg) {
    const s = this.step;
    if (this.done || s?.kind !== 'do' || !s.event) return;
    if (s.event[0] === name && (s.event[1] == null || s.event[1] === arg)) this.next();
  }

  // Toque: true = o tutorial ficou com ele (o jogo não processa)
  tap(x, y) {
    if (this.done) return false;
    const s = this.step;
    if (s.kind === 'say') {
      if (this.t > 0.35) this.next(); // (meio segundo pra não pular sem ler)
      return true;
    }
    const L = layout(this.g);
    if (s.kind === 'do') {
      if (s.allow(x, y, L)) return false;
      this.nudge = 1; // tocou fora: a mãozinha chacoalha
      return true;
    }
    // esperando (onda rolando): só pausar, iniciar e acelerar; o resto
    // (posicionar, vender, upgrade...) fica travado até o tutorial acabar
    return !(inRect(L.pause, x, y) || inRect(L.speed, x, y) || (inRect(L.play, x, y) && !this.g.rounds.active));
  }

  // Posicionar defesa: durante o tutorial só no passo de colocar aquela
  // defesa e só no quadrado que a mãozinha mostra (x, y do mapa)
  allowPlace(type, x, y) {
    if (this.done) return true;
    const s = this.step;
    if (s?.kind !== 'do' || s.event?.[0] !== 'place' || s.event[1] !== type) return false;
    const tg = s.target();
    const [c, r] = tileOf(x, y);
    const [tc, tr] = tileOf(tg.x - this.g.offsetX, tg.y);
    return c === tc && r === tr;
  }

  // ── alvos da mãozinha (coordenadas de tela) ──
  tileRect(L, type) {
    return L.tiles.find((t) => t.type === type);
  }

  tile(type) {
    const r = this.tileRect(layout(this.g), type);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2, r: 46 };
  }

  rect(name, i) {
    const L = layout(this.g);
    const r = i == null ? L[name] : L[name][i];
    return { x: r.x + r.w / 2, y: r.y + r.h / 2, r: Math.max(r.w, r.h) * 0.6 };
  }

  itemRect(id) {
    const r = layout(this.g).items.find((it) => it.id === id);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2, r: 46 };
  }

  // Melhor quadrado pra defesa: o que mais cobre o caminho (Honeypot: em
  // cima do caminho, mais ou menos no meio dele). Calculado uma vez por tipo
  spotFor(type) {
    this.spots ??= {};
    if (!this.spots[type]) {
      const g = this.g;
      const route = g.path.routes[0];
      let best = null;
      if (TOWERS[type].onPath) {
        for (const f of [0.5, 0.45, 0.55, 0.4, 0.6, 0.35, 0.65, 0.3, 0.7]) {
          const p = route.pointAt(route.length * f);
          const c = tileCenter(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
          if (g.canPlace(type, c.x, c.y) && this.clear(c)) {
            best = c;
            break;
          }
        }
      } else {
        const range = TOWERS[type].range ?? 100;
        const samples = [];
        for (let d = g.view.spawnDists[0]; d < route.length; d += 18) samples.push(route.pointAt(d));
        let top = -1;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const p = tileCenter(c, r);
            if (!g.canPlace(type, p.x, p.y) || !this.clear(p)) continue;
            const v = samples.filter((s) => Math.hypot(s.x - p.x, s.y - p.y) <= range).length;
            if (v > top) [top, best] = [v, p];
          }
        }
      }
      this.spots[type] = best ?? { x: g.mapW / 2, y: 270 };
    }
    const s = this.spots[type];
    return { x: s.x + this.g.offsetX, y: s.y, r: TILE * 0.62, tile: true };
  }

  // Quadrado livre pro toque: fora da aba de informações da defesa (canto de
  // cima à direita do mapa, aberta enquanto se posiciona) e da caixa de fala
  clear(p) {
    const sx = p.x + this.g.offsetX;
    const underInfo = sx > this.g.mapW - 250 && p.y < 330;
    const underTalk = p.y > 400;
    return !underInfo && !underTalk;
  }

  // Garante dinheiro (o tutorial não pode travar sem ele)
  fund(cost) {
    if (this.g.money < cost) this.g.money = cost;
  }

  fundUpgrade(type) {
    const tw = this.g.towers.find((t) => t.type === type);
    if (tw?.nextUpgrade) this.fund(tw.nextUpgrade.cost);
  }

  // Onde está a defesa no mapa (pra tocar e abrir os upgrades)
  towerSpot(type) {
    const tw = this.g.towers.find((t) => t.type === type);
    if (!tw) return this.spotFor(type);
    return { x: tw.x + this.g.offsetX, y: tw.y - 8, r: TILE * 0.62, tile: true };
  }

  // Enxurrada da aula do Honeypot: SWARM.n vírus saindo em fila, contando
  // como parte da onda atual (a onda só acaba quando eles morrerem). O lugar
  // do pote já sai escolhido: no caminho, dentro do alcance do Hacker
  startSwarm() {
    this.swarm = { left: SWARM.n, timer: 0, lead: null };
    this.honey = this.honeyByHacker();
  }

  spawnSwarm(dt) {
    const sw = this.swarm;
    if (!sw || sw.left <= 0 || this.frozen) return;
    sw.timer -= dt;
    while (sw.timer <= 0 && sw.left > 0) {
      const g = this.g;
      const e = new Enemy(SWARM.type, g.view.spawnDists[0], g.path.routes[0]);
      e.round = g.rounds.done;
      e.speedMul = g.rounds.mod.speed;
      e.scaleHp(g.rounds.mod.hp);
      e.place();
      g.spawnEnemy(e);
      sw.lead ??= e;
      sw.left--;
      sw.timer += SWARM.gap;
    }
  }

  // O vírus da frente da enxurrada está chegando no lugar do pote (perto do
  // Hacker). Sem lugar perto do Hacker: quando ele andar 30% do caminho
  swarmClose() {
    const lead = this.swarm?.lead;
    if (!lead) return false;
    if (lead.dead) return true;
    const at = this.honey ? this.honey.d - TILE * SWARM.near : lead.route.length * 0.3;
    return lead.dist >= at;
  }

  // Quadrado do caminho (1ª rota) dentro do alcance do Hacker, o mais perto
  // dele; entre os parecidos, o que vem antes no caminho (os vírus chegam
  // nele primeiro, e o Hacker acerta quem está mordendo)
  honeyByHacker() {
    const g = this.g;
    const hk = g.towers.find((t) => t.type === 'hacker');
    if (!hk) return null;
    const route = g.path.routes[0];
    const reach = hk.stats.range - TILE * 0.3;
    let best = null;
    for (let d = g.view.spawnDists[0] + TILE * 4; d < route.length - TILE; d += TILE / 2) {
      const p = route.pointAt(d);
      const c = tileCenter(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
      const far = Math.hypot(c.x - hk.x, c.y - hk.y);
      if (far > reach || !g.canPlace('honeypot', c.x, c.y) || !this.clear(c)) continue;
      const v = far + d * 0.02;
      if (!best || v < best.v) best = { x: c.x, y: c.y, d, v };
    }
    return best;
  }

  // Dinheiro pro pote e o lugar dele: o de perto do Hacker (se os vírus ainda
  // não passaram dele); senão no caminho, logo na frente do vírus da frente
  prepHoneypot() {
    this.fund(this.g.costOf('honeypot'));
    this.g.selectedTower = null; // a loja precisa estar à vista
    const g = this.g;
    const lead = g.enemies.filter((e) => !e.dead && e.route === g.path.routes[0]).sort((a, b) => b.dist - a.dist)[0];
    const h = this.honey;
    if (h && (!lead || lead.dist < h.d - TILE)) {
      this.honeySpot = { x: h.x + g.offsetX, y: h.y, r: TILE * 0.62, tile: true };
      return;
    }
    if (!lead) return;
    const route = lead.route;
    for (let d = lead.dist + TILE * 2.5; d < Math.min(route.length, lead.dist + TILE * 9); d += TILE / 2) {
      const p = route.pointAt(d);
      const c = tileCenter(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
      if (g.canPlace('honeypot', c.x, c.y) && this.clear(c)) {
        this.honeySpot = { x: c.x + g.offsetX, y: c.y, r: TILE * 0.62, tile: true };
        return;
      }
    }
  }

  // Presente do tutorial: 1 consumível no inventário
  giftItem(id) {
    const inv = this.g.app.inventory ?? (this.g.app.save.inventory ??= {});
    inv[id] = (inv[id] ?? 0) + 1;
    writeSave(this.g.app.save);
  }
}
