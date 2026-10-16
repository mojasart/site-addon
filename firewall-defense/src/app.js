import { MIN_VIEW_W, VIEW_H, DEBUG, ENERGY } from './config.js';
import { setLang, deviceLang, lang, t } from './i18n.js';
import { askNotifications } from './notify.js';
import { MAPS, MAPS_PER_SEASON, BOUNTY_MAPS } from './data/maps.js';
import { loadSave, writeSave, pauseSaving } from './save.js';
import { Sound } from './audio/Sound.js';
import { setPixelScale, rrect, fillOutline, text } from './render/canvas.js';
import { buy as payBuy, syncPurchases, payEnabled } from './pay.js';
import { TitleScene } from './scenes/TitleScene.js';
import { LevelSelectScene } from './scenes/LevelSelectScene.js';
import { Game } from './game.js';
import { CatalogScene } from './scenes/CatalogScene.js';
import { DarkNetScene } from './scenes/DarkNetScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { NameScene } from './scenes/NameScene.js';
import { ITEM, CONSUMABLES, VIP } from './data/consumables.js';
import { drawEnergyModal, energyLayout } from './render/energy.js';
import { inRect } from './render/widgets.js';
import { configAds, showRewarded, adSdk } from './ads.js';
import { trackAd, trackCoffee, trackDesign, analyticsPause, analyticsResume, stopAnalytics } from './analytics.js';
import { DARKNET_STARS, COFFEE, mapCoffee, NODE, TREE } from './data/darknet.js';
import { DAILY, makeChallenge, dailyCoffee, makeMissions, MISSION_COFFEE } from './data/daily.js';
import { ENEMIES } from './data/enemies.js';
import { DailyScene } from './scenes/DailyScene.js';

// Controla as telas (título → mapas → jogo), a transição entre elas,
// o progresso salvo e o som.
// Dia de hoje (hora local) contado desde 1970: chave do brinde da loja
function today() {
  const now = new Date();
  return Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
}

// Lugares dos anúncios com recompensa (nome mandado pro Google e pro analytics)
const AD_PLACES = { energy: 'energia', gift: 'brinde_do_dia', double: 'dobrar_cafe', revive: 'reviver' };

export class App {
  constructor({ debug = false, mute = false } = {}) {
    configAds(); // pré-carrega os anúncios com recompensa do Google
    this.debug = false;
    this.save = loadSave();
    this.migrateBounty();
    // café por vírus caiu 20% (COFFEE.perKill): os abatidos até aqui seguem no valor antigo
    if (this.save.killsOldRate == null) this.save.killsOldRate = this.save.kills ?? 0;
    // o Acesso Root custava 3 cafés (agora 5): quem comprou antes recebe 3 de volta num reembolso
    if (this.perks.root && this.save.darknetPaid?.root == null) this.save.darknetPaid = { ...this.save.darknetPaid, root: 3 };
    this.migrateMinerBranch();
    // quem já usava a Dark Net (antes da animação de desbloqueio existir) não vê ela
    if (Object.keys(this.save.darknet ?? {}).length || this.save.coffeeSpent) this.save.darknetUnlockSeen = true;
    if (debug) this.enableDebug();
    // saves antigos: música/efeitos desligados viram volume 0
    if (this.save.music === false) this.save.musicVol = 0;
    if (this.save.sfx === false) this.save.sfxVol = 0;
    delete this.save.music;
    delete this.save.sfx;
    if (mute) {
      // ?mute: sem música nem efeitos (dá pra aumentar de novo no volume)
      this.save.musicVol = 0;
      this.save.sfxVol = 0;
    }
    // idioma: o escolhido na tela do nome, ou o do aparelho na 1ª vez
    setLang(this.save.lang ?? deviceLang());
    this.sound = new Sound(this.save);
    this.viewW = MIN_VIEW_W;
    this.pixelScale = 1;
    this.scene = new TitleScene(this);
    this.next = null; // próxima cena (durante o fade)
    this.fade = 1; // começa escuro e clareia
    // compras com dinheiro de verdade: entrega as aprovadas (e avisa a volta
    // do pagamento: ?compra=ok / pendente / falhou)
    this.payNotice = null;
    if (payEnabled()) this.refreshPurchases(new URLSearchParams(location.search).get('compra'));
  }

  // ── Compras (src/pay.js) ──
  // Aviso no topo da tela (por cima de qualquer cena)
  notify(text, time = 3.2, color = '#3dff9a') {
    this.payNotice = { text, time, color };
  }

  // Voltou do pagamento (status) ou abriu o jogo: busca e entrega as compras
  async refreshPurchases(status = null) {
    if (status) history.replaceState(null, '', location.pathname + location.search.replace(/[?&]compra=[^&]*/, '').replace(/^&/, '?'));
    if (status === 'pendente') this.notify(t('Pagamento em análise: os cafés chegam quando ele for aprovado'), 4, '#ffd23f');
    if (status === 'falhou') this.notify(t('O pagamento não foi concluído'), 3, '#ff7a8a');
    // o aviso do Mercado Pago pode chegar uns segundos depois da volta: tenta de novo
    for (let tries = status === 'ok' ? 4 : 1; tries > 0; tries--) {
      const got = await syncPurchases(this);
      if (got.length) {
        this.notify(t('COMPRA CONFIRMADA: {list}', { list: got.join(' · ') }), 4);
        this.sound.play('upgrade');
        return;
      }
      if (tries > 1) await new Promise((r) => setTimeout(r, 2500));
    }
    if (status === 'ok') this.notify(t('Pagamento recebido! Se os cafés não aparecerem, abra o jogo de novo em alguns minutos'), 5, '#ffd23f');
  }

  // Abre o pagamento de um pacote de café ou do VIP
  async buy(product) {
    if (this.buying) return;
    this.buying = true;
    this.notify(t('Abrindo o pagamento...'), 6, '#d8e6ff');
    const ok = await payBuy(this, product);
    this.buying = false;
    if (!ok) this.notify(t('Não deu pra abrir o pagamento. Confira a internet e tente de novo'), 3.5, '#ff7a8a');
  }

  // Saves de antes das salas do Bug Bounty: as fases 10, 20, 30 e 40 eram
  // Bug Bounty e viraram fases normais. As estrelas delas saem (senão
  // contariam como fase vencida), mas os cafés que davam (2/4/6) ficam
  migrateBounty() {
    const s = this.save;
    if (s.bountyRooms) return;
    let coffee = 0;
    for (const id of ['placa-mae-10', 'data-center-5', 'data-center-15', 'cabo-submarino-10']) {
      coffee += [0, 2, 4, 6][s.stars[id] ?? 0] ?? 0;
      delete s.stars[id];
      if (s.bounty) delete s.bounty[id];
    }
    s.legacyBountyCoffee = coffee;
    s.bountyRooms = true;
    writeSave(s);
  }

  // Modo debug (?debug na URL ou tocando no worm da tela inicial): todos os
  // mapas, platinas e salas liberados (sem estrelas feitas), DEBUG.coffee
  // cafés e DEBUG.items de cada consumível; o dinheiro da fase é o normal. Usa uma cópia do save que não é
  // gravada: o progresso de verdade volta ao recarregar a página
  enableDebug() {
    if (this.debug) return;
    this.debug = true;
    stopAnalytics(); // save de mentira: não manda mais nada
    pauseSaving();
    this.save = structuredClone(this.save);
    this.save.inventory = Object.fromEntries(CONSUMABLES.map((c) => [c.id, DEBUG.items]));
  }

  get game() {
    return this.scene instanceof Game ? this.scene : null;
  }

  resize(viewW, pixelScale) {
    this.viewW = viewW;
    this.pixelScale = pixelScale;
    setPixelScale(pixelScale);
    this.scene.resize?.(viewW);
  }

  go(makeScene) {
    if (this.next) return;
    this.game?.bankKills(); // saindo de uma partida: os abatidos dela viram cafés
    this.next = makeScene;
  }

  goTitle() {
    this.go(() => new TitleScene(this));
  }

  goMaps() {
    this.go(() => new LevelSelectScene(this));
    // app Android: na 1ª vez nos mapas pede a permissão das notificações
    if (this.save.playerName) askNotifications(this);
  }

  // JOGAR na tela inicial: na primeira vez pergunta o nome (janelinha por
  // cima da tela inicial, sem transição); depois, mapas
  goPlay() {
    if (this.save.playerName) this.goMaps();
    else if (!this.next) this.scene = new NameScene(this, this.scene);
  }

  // Nome que o Hacker usa pra falar com o jogador
  get playerName() {
    return this.save.playerName || null;
  }

  setPlayerName(name) {
    this.save.playerName = name;
    writeSave(this.save);
  }

  goCatalog() {
    this.go(() => new CatalogScene(this));
  }

  goDarkNet() {
    this.go(() => new DarkNetScene(this));
  }

  goShop() {
    this.go(() => new ShopScene(this));
  }

  // returnTo: partida pausada (o DIÁRIO do menu de pausa só mostra a tela e volta)
  goDaily(returnTo = null) {
    this.go(() => new DailyScene(this, { returnTo }));
  }

  // ── Diário: desafio do dia e missões do dia (data/daily.js) ──
  get day() {
    return today();
  }

  // ms até virar o dia (novo desafio, novas missões e o brinde da loja)
  dayNextMs() {
    return this.freeOfferNextMs();
  }

  // Fases vencidas (índices em MAPS, em ordem)
  wonMaps() {
    return MAPS.map((m, i) => ((this.save.stars[m.id] ?? 0) > 0 ? i : -1)).filter((i) => i >= 0);
  }

  // Desafio do dia liberado? (DAILY.unlock fases vencidas; no debug, sempre)
  dailyOpen() {
    return this.debug || this.wonMaps().length >= DAILY.unlock;
  }

  // O desafio de hoje: { day, map, mods, blocked, won }. Fica no save no 1º
  // acesso do dia (vencer mais fases depois não troca a fase dele). map null =
  // ainda trancado (aí tenta de novo no próximo acesso)
  get challenge() {
    const day = today();
    const cur = this.save.daily;
    if (cur?.day === day && (cur.map != null || !this.dailyOpen())) return cur;
    // debug: libera mesmo sem fase vencida (a sorteada entre as 10 primeiras)
    const won = this.debug && this.wonMaps().length < DAILY.unlock ? MAPS.slice(0, DAILY.pool + 1).map((_, i) => i) : this.wonMaps();
    this.save.daily = { ...makeChallenge(day, won), won: false };
    writeSave(this.save);
    return this.save.daily;
  }

  // O desafio do dia é 1 tentativa só: começou a partida, gastou (sem
  // reiniciar, sem jogar de novo; vencendo ou perdendo, só amanhã)
  dailyPlayed() {
    return !!this.challenge?.played;
  }

  markDailyPlayed() {
    const c = this.challenge;
    if (!c || c.played) return;
    c.played = true;
    writeSave(this.save);
  }

  // Dias seguidos vencendo o desafio, contando hoje (0 se a sequência quebrou)
  get dailyStreak() {
    const st = this.save.dailyStreak;
    return st && st.last >= today() - 1 ? st.n : 0;
  }

  // Venceu o desafio do dia: a 1ª vitória do dia soma a sequência e dá os
  // cafés. Devolve { coffee, streak } (null se hoje já tinha vencido)
  recordDaily() {
    const c = this.challenge;
    if (c.won) return null;
    c.won = true;
    const day = today();
    const st = this.save.dailyStreak;
    const n = st?.last === day - 1 ? st.n + 1 : 1;
    this.save.dailyStreak = { last: day, n };
    const coffee = dailyCoffee(n);
    this.save.dailyCoffee = (this.save.dailyCoffee ?? 0) + coffee;
    this.missionProgress({ daily: 1 });
    writeSave(this.save);
    trackDesign('Daily:Streak', n);
    return { coffee, streak: n };
  }

  // O ramo do Bloco Raro do Minerador (Bloco Raro, Veio de Ouro, Hash da
  // Sorte) virou Patrocinador e Aposta, nos mesmos ids. Quem tinha comprado
  // os antigos recebe os cafés de volta (1 vez) e escolhe de novo se quiser
  migrateMinerBranch() {
    if (this.save.minerBranchV2) return;
    this.save.minerBranchV2 = true;
    const OLD = { minerador3: 8, minerador3b: 10, minerador3c: 12 };
    const darknet = { ...this.perks };
    const paid = { ...this.save.darknetPaid };
    let back = 0;
    for (const [id, cost] of Object.entries(OLD)) {
      if (!darknet[id]) continue;
      back += paid[id] ?? cost;
      delete darknet[id];
      delete paid[id];
    }
    if (back) {
      this.save.darknet = darknet;
      this.save.darknetPaid = paid;
      this.save.coffeeSpent = Math.max(0, (this.save.coffeeSpent ?? 0) - back);
    }
  }

  // As missões de hoje: [{ id, goal, tower?, n, claimed }]
  get missions() {
    const day = today();
    if (this.save.missions?.day !== day) {
      this.save.missions = { day, list: makeMissions(day, this.dailyOpen()) };
      writeSave(this.save);
    }
    return this.save.missions.list;
  }

  // Missões completas que ainda não foram coletadas (bolinha no botão DIÁRIO)
  get missionsReady() {
    return this.missions.filter((m) => !m.claimed && m.n >= m.goal).length;
  }

  // Progresso das missões (Game.bankKills, no fim e ao sair da partida):
  // pops, upgrades, coins, taps, daily (números) e killsBy, placedBy (por tipo)
  missionProgress(d) {
    const kills = d.killsBy ?? {};
    const got = {
      pops: d.pops ?? 0,
      upgrades: d.upgrades ?? 0,
      coins: d.coins ?? 0,
      taps: d.taps ?? 0,
      daily: d.daily ?? 0,
      bosses: Object.entries(kills).reduce((sum, [type, n]) => sum + (ENEMIES[type]?.boss ? n : 0), 0),
    };
    let changed = false;
    for (const m of this.missions) {
      if (m.claimed || m.n >= m.goal) continue;
      const add = m.id === 'place' ? (d.placedBy?.[m.tower] ?? 0) : (got[m.id] ?? 0);
      if (add <= 0) continue;
      m.n = Math.min(m.goal, m.n + add);
      changed = true;
    }
    if (changed) writeSave(this.save);
  }

  // Venceu uma partida (Game.end): mode e estrelas
  missionWin(mode, stars) {
    for (const m of this.missions) {
      if (m.claimed || m.n >= m.goal) continue;
      if (m.id === 'wins' || (m.id === 'three' && mode === 'normal' && stars >= 3)) m.n++;
    }
    writeSave(this.save);
  }

  // COLETAR: a missão completa vira café
  claimMission(k) {
    const m = this.missions[k];
    if (!m || m.claimed || m.n < m.goal) return false;
    m.claimed = true;
    this.save.missionCoffee = (this.save.missionCoffee ?? 0) + MISSION_COFFEE;
    writeSave(this.save);
    trackDesign(`Mission:Claim:${m.id}`);
    trackCoffee('source', MISSION_COFFEE, 'Mission', m.id);
    return true;
  }

  // Consumíveis no inventário (data/consumables.js): { id: quantidade }
  get inventory() {
    return (this.save.inventory ??= {});
  }

  // Compra 1 consumível com café (vai pro inventário)
  buyConsumable(id) {
    const item = ITEM[id];
    if (!item || this.coffee < item.cost) return false;
    this.save.coffeeSpent = (this.save.coffeeSpent ?? 0) + item.cost;
    this.inventory[id] = (this.inventory[id] ?? 0) + 1;
    writeSave(this.save);
    trackCoffee('sink', item.cost, 'Item', id);
    return true;
  }

  // Brinde do dia da loja: 1 consumível de graça por dia, pego assistindo
  // um anúncio; o item muda a cada dia (vira à meia-noite, hora local)
  get freeOffer() {
    const day = today();
    return { id: CONSUMABLES[day % CONSUMABLES.length].id, claimed: this.save.freeItemDay === day };
  }

  // ms até o próximo brinde (meia-noite)
  freeOfferNextMs() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
  }

  // Abre o anúncio; no fim dele o brinde vai pro inventário
  watchAdForFree() {
    if (this.energyUI || this.freeOffer.claimed) return false;
    this.watchAd('gift', { reward: this.freeOffer.id });
    return true;
  }

  // Anúncio com recompensa: o do Google (ads.js); sem anúncio disponível,
  // o simulado do jogo (energyUI 'ad'). kind: o que ele dá (AD_PLACES);
  // reward = id do brinde da loja; pending = partida que ia começar (energia);
  // onReward = o que fazer quando ganha (dobrar café, reviver)
  watchAd(kind, { reward = null, pending = null, onReward = null } = {}) {
    const place = AD_PLACES[kind];
    const ui = { mode: 'loading', t: 0, kind, reward, pending, onReward };
    this.energyUI = ui;
    showRewarded(place, {
      beforeAd: () => {
        this.sound.suspend();
        trackAd('show', place, adSdk());
      },
      afterAd: () => this.sound.resume(),
      done: (result) => {
        if (this.energyUI !== ui) return;
        if (result === 'viewed') this.grantAd(ui);
        else if (result === 'dismissed') {
          // fechou antes do fim: não ganha (a janela de energia volta, com o aviso)
          this.energyUI = kind === 'energy' ? { mode: 'empty', t: 1, pending, note: t('Assista até o fim pra ganhar') } : null;
          this.sound.play('error');
        } else {
          trackAd('failed', place, adSdk());
          trackAd('show', place, 'simulated');
          this.energyUI = { ...ui, mode: 'ad', t: 0 };
        }
      },
    });
  }

  // Assistiu até o fim: a recompensa (energias, o brinde ou a da partida) e
  // segue pra partida, se tinha
  grantAd(ui) {
    trackAd('reward', AD_PLACES[ui.kind], ui.mode === 'ad' ? 'simulated' : adSdk());
    if (ui.onReward) ui.onReward();
    else if (ui.reward) this.claimFreeItem();
    else this.addEnergy(ENERGY.ad);
    this.sound.play('upgrade');
    this.energyUI = null;
    if (ui.reward) this.scene.rewarded?.(ui.reward);
    if (ui.pending) this.startMap(ui.pending.i, ui.pending.mode);
  }

  // DOBRAR CAFÉ (vitória): o café da partida de novo
  addAdCoffee(n) {
    this.save.adCoffee = Math.round(((this.save.adCoffee ?? 0) + n) * 100) / 100;
    writeSave(this.save);
    trackCoffee('source', n, 'Ad', 'double');
  }

  claimFreeItem() {
    const { id, claimed } = this.freeOffer;
    if (claimed) return false;
    this.inventory[id] = (this.inventory[id] ?? 0) + 1;
    this.save.freeItemDay = today();
    writeSave(this.save);
    return true;
  }

  // Gasta 1 consumível do inventário (usado na partida)
  consumeItem(id) {
    if (!(this.inventory[id] > 0)) return false;
    this.inventory[id]--;
    writeSave(this.save);
    return true;
  }

  // Estrelas somadas de todos os mapas
  get totalStars() {
    return MAPS.reduce((sum, m) => sum + (this.save.stars[m.id] ?? 0), 0);
  }

  // Dark Net: libera com DARKNET_STARS estrelas (no modo debug, sempre)
  darkNetOpen() {
    return this.debug || this.totalStars >= DARKNET_STARS;
  }

  // Cafés ganhos até agora (pelo recorde de cada mapa: data/darknet.js)
  // (mais os dos monstros abatidos em todas as partidas)
  get coffeeEarned() {
    const maps = MAPS.reduce((sum, m) => sum + mapCoffee(this.save.stars[m.id], this.hasPlatinum(m.id)), 0);
    const bounty = BOUNTY_MAPS.reduce((sum, m) => sum + mapCoffee(this.save.stars[m.id], false, true), 0) + (this.save.legacyBountyCoffee ?? 0);
    const daily = (this.save.dailyCoffee ?? 0) + (this.save.missionCoffee ?? 0); // diário (desafio e missões)
    const ads = this.save.adCoffee ?? 0; // DOBRAR CAFÉ (anúncio na vitória)
    const kills = this.save.kills ?? 0;
    const old = Math.min(kills, this.save.killsOldRate ?? 0); // abatidos antes do nerf (valor antigo)
    const killCoffee = old * COFFEE.perKillOld + (kills - old) * COFFEE.perKill;
    return maps + bounty + daily + ads + killCoffee + (this.save.duckCoffee ?? 0) + (this.save.boughtCoffee ?? 0);
  }

  // Café que o Pato de Borracha achou numa partida (upgrade secreto)
  addDuckCoffee(v) {
    this.save.duckCoffee = Math.round(((this.save.duckCoffee ?? 0) + v) * 100) / 100;
    writeSave(this.save);
  }

  // Saldo de cafés pra gastar na Dark Net (com 2 casas: os abatidos dão fração)
  get coffee() {
    if (this.debug) return Math.round((DEBUG.coffee - (this.save.coffeeSpent ?? 0)) * 100) / 100;
    return Math.round((this.coffeeEarned - (this.save.coffeeSpent ?? 0)) * 100) / 100;
  }

  // Modo VIP: energia infinita (e os cafés do VIP já vêm junto, em grantVip)
  get vip() {
    return !!this.save.vip;
  }

  // Ativa o VIP (quando a compra for confirmada): +VIP.coffee cafés e
  // energia infinita pra sempre
  grantVip() {
    if (this.save.vip) return false;
    this.save.vip = true;
    this.save.boughtCoffee = (this.save.boughtCoffee ?? 0) + VIP.coffee;
    writeSave(this.save);
    return true;
  }

  // Monstros abatidos numa partida entram no total do save (viram cafés)
  addKills(n) {
    this.save.kills = (this.save.kills ?? 0) + n;
    writeSave(this.save);
  }

  // Catálogo: soma os abatidos por tipo de vírus e as defesas usadas
  addTally(kills, placed) {
    const add = (into, from) => {
      for (const [k, n] of Object.entries(from)) into[k] = (into[k] ?? 0) + n;
    };
    add((this.save.killsBy ??= {}), kills);
    add((this.save.placedBy ??= {}), placed);
    writeSave(this.save);
  }

  // Árvore da Dark Net: upgrades comprados (save.darknet)
  get perks() {
    return this.save.darknet ?? {};
  }

  // Dá pra comprar esse nó? (ainda não tem, já tem o anterior e tem cafés)
  canBuyPerk(id) {
    const n = NODE[id];
    return !!n && !this.perks[id] && (!n.parent || !!this.perks[n.parent]) && this.coffee >= n.cost;
  }

  buyPerk(id) {
    if (!this.canBuyPerk(id)) return false;
    this.save.darknet = { ...this.perks, [id]: true };
    // quanto pagou (o reembolso devolve isso, mesmo se o preço mudar depois)
    this.save.darknetPaid = { ...this.save.darknetPaid, [id]: NODE[id].cost };
    this.save.coffeeSpent = (this.save.coffeeSpent ?? 0) + NODE[id].cost;
    writeSave(this.save);
    trackCoffee('sink', NODE[id].cost, 'DarkNet', id);
    return true;
  }

  // Nós que saem junto num rollback: o próprio e os comprados que dependem dele
  perkRollbackSet(id) {
    const out = [];
    const walk = (pid) => {
      if (!this.perks[pid]) return;
      out.push(pid);
      for (const n of TREE) if (n.parent === pid) walk(n.id);
    };
    walk(id);
    return out;
  }

  // Cafés que voltam ao desfazer esse nó (com os que dependem dele)
  perkRefund(id) {
    return this.perkRollbackSet(id).reduce((sum, k) => sum + (this.save.darknetPaid?.[k] ?? NODE[k].cost), 0);
  }

  // Rollback: desfaz o nó (e os que dependem dele) e devolve os cafés
  refundPerk(id) {
    const ids = this.perkRollbackSet(id);
    if (!ids.length) return false;
    const back = this.perkRefund(id);
    const darknet = { ...this.perks };
    const paid = { ...this.save.darknetPaid };
    for (const k of ids) {
      delete darknet[k];
      delete paid[k];
    }
    this.save.darknet = darknet;
    this.save.darknetPaid = paid;
    this.save.coffeeSpent = Math.max(0, (this.save.coffeeSpent ?? 0) - back);
    writeSave(this.save);
    trackCoffee('source', back, 'DarkNet', 'refund');
    return true;
  }

  // Ameaça já apareceu numa fase? (no modo debug, todas)
  hasSeen(type) {
    return this.debug || !!this.save.seen?.[type];
  }

  // Primeira vez que um tipo de vírus aparece: entra no catálogo.
  // Devolve true se for novidade.
  discover(type) {
    if (this.save.seen?.[type]) return false;
    this.save.seen = { ...this.save.seen, [type]: true };
    writeSave(this.save);
    return true;
  }

  // mode: 'normal' ou 'platinum' (libera com 3 estrelas)
  // Começa (ou reinicia) uma partida: precisa de pelo menos 1 energia, que só
  // é gasta quando a 1ª onda acaba (Game.onRoundEnd). Sem energia, abre a
  // janela "SEM ENERGIA" (com o anúncio); depois do anúncio a partida começa
  startMap(i, mode = 'normal') {
    if (this.next || this.energyUI) return;
    // desafio do dia: 1 tentativa só (dailyPlayed)
    if (mode === 'daily' && this.dailyPlayed()) {
      this.sound.play('error');
      return;
    }
    if (!this.debug && !this.vip && this.energy <= 0) {
      this.energyUI = { mode: 'empty', t: 0, pending: { i, mode } };
      this.sound.play('error');
      trackDesign('Energy:Empty');
      return;
    }
    this.go(() => new Game(this, i, mode));
  }

  // ── Energia (ENERGY em config.js; save.energy + save.energyAt) ──
  // energyAt: quando a recarga atual começou a contar (ms). Volta 1 a cada
  // regenMin minutos enquanto estiver abaixo do máximo
  get energyRegenMs() {
    return ENERGY.regenMin * 60 * 1000;
  }

  refreshEnergy() {
    const s = this.save;
    if (s.energy >= ENERGY.max) return;
    const gained = Math.floor((Date.now() - s.energyAt) / this.energyRegenMs);
    if (gained <= 0) return;
    s.energy = Math.min(ENERGY.max, s.energy + gained);
    s.energyAt = s.energy >= ENERGY.max ? Date.now() : s.energyAt + gained * this.energyRegenMs;
    writeSave(s);
  }

  get energy() {
    this.refreshEnergy();
    return this.save.energy;
  }

  // ms até a próxima energia voltar (0 com a energia cheia)
  energyNextMs() {
    if (this.energy >= ENERGY.max) return 0;
    return Math.max(0, this.save.energyAt + this.energyRegenMs - Date.now());
  }

  // Gasta 1 energia (no modo debug e no VIP é de graça). false se não tiver
  spendEnergy() {
    if (this.debug || this.vip) return true;
    if (this.energy <= 0) return false;
    if (this.save.energy >= ENERGY.max) this.save.energyAt = Date.now(); // começa a recarregar agora
    this.save.energy--;
    writeSave(this.save);
    return true;
  }

  addEnergy(n) {
    this.refreshEnergy();
    this.save.energy = Math.min(ENERGY.max, this.save.energy + n);
    writeSave(this.save);
  }

  // Toque na janela de energia (ela fica por cima de qualquer tela)
  energyTap(x, y) {
    const ui = this.energyUI;
    const L = energyLayout(this);
    if (ui.mode === 'ad') {
      // anúncio simulado: só fecha depois da contagem, pegando as energias
      // (ou o brinde do dia da loja)
      if (ui.t >= ENERGY.adTime && inRect(L.skip, x, y)) this.grantAd(ui);
      return;
    }
    if (ui.mode === 'loading') return; // esperando o anúncio do Google
    if (inRect(L.watch, x, y)) {
      this.sound.play('click');
      this.watchAd('energy', { pending: ui.pending });
    } else if (inRect(L.close, x, y) || !inRect(L.card, x, y)) {
      this.energyUI = null;
      this.sound.play('click');
    }
  }

  hasPlatinum(mapId) {
    return !!this.save.platinum?.[mapId];
  }

  // Todos os mapas da season com a platina vencida?
  seasonPlatinum(s) {
    return MAPS.slice(s * MAPS_PER_SEASON, (s + 1) * MAPS_PER_SEASON).every((m) => this.hasPlatinum(m.id));
  }

  // Quantas fases da season já têm a platina vencida
  seasonPlatinumCount(s) {
    return MAPS.slice(s * MAPS_PER_SEASON, (s + 1) * MAPS_PER_SEASON).filter((m) => this.hasPlatinum(m.id)).length;
  }

  // Sala do Bug Bounty da season: abre com a season inteira platinada
  bountyOpen(s) {
    return this.debug || this.seasonPlatinum(s);
  }

  // Modo platina liberado nesse mapa? (precisa das 3 estrelas)
  platinumOpen(i) {
    return this.debug || (this.save.stars[MAPS[i].id] ?? 0) >= 3;
  }

  recordPlatinum(mapId) {
    if (this.hasPlatinum(mapId)) return;
    this.save.platinum = { ...this.save.platinum, [mapId]: true };
    writeSave(this.save);
  }

  // Abre vencendo o anterior (ou se já foi vencido: saves de quando as
  // fases 10, 20, 30 e 40 eram Bug Bounty e não travavam a seguinte)
  isUnlocked(i) {
    if (this.debug || i === 0) return true;
    const stars = (m) => this.save.stars[m.id] ?? 0;
    return stars(MAPS[i - 1]) > 0 || stars(MAPS[i]) > 0;
  }

  // Recorde de pontos de uma sala do Bug Bounty
  bountyBest(mapId) {
    return this.save.bounty?.[mapId] ?? 0;
  }

  recordBounty(mapId, score) {
    if (score <= this.bountyBest(mapId)) return;
    this.save.bounty = { ...this.save.bounty, [mapId]: score };
    writeSave(this.save);
  }

  // Recorde de pontos da platina de uma fase (contando a platina infinita)
  endlessBest(mapId) {
    return this.save.endless?.[mapId] ?? 0;
  }

  recordEndless(mapId, score) {
    if (score <= this.endlessBest(mapId)) return;
    this.save.endless = { ...this.save.endless, [mapId]: score };
    writeSave(this.save);
  }

  recordStars(mapId, n) {
    if (n > (this.save.stars[mapId] ?? 0)) {
      this.save.stars[mapId] = n;
      writeSave(this.save);
    }
  }

  // Volume da música ou dos efeitos (kind: 'music' | 'sfx'), de 0 (mudo) a 1,
  // em passos de 5%
  // Idioma escolhido pelo jogador (tela do nome e configurações)
  setLanguage(l) {
    setLang(l);
    this.save.lang = lang();
    writeSave(this.save);
  }

  setVolume(kind, v) {
    v = Math.round(Math.min(1, Math.max(0, v)) * 20) / 20;
    const key = kind === 'music' ? 'musicVol' : 'sfxVol';
    if (this.save[key] === v) return;
    if (kind === 'music') this.sound.setMusicVol(v);
    else this.sound.setSfxVol(v);
    writeSave(this.save);
  }

  // Botão de som da tela inicial: abaixa em degraus (100% → 50% → 0% → 100%)
  stepVolume(kind) {
    const v = this.save[kind === 'music' ? 'musicVol' : 'sfxVol'];
    this.setVolume(kind, v > 0.5 ? 0.5 : v > 0 ? 0 : 1);
    this.sound.play('click');
  }

  // Turno automático: a próxima rodada começa sozinha quando o mapa limpa
  toggleAuto() {
    this.save.autoRound = !this.save.autoRound;
    writeSave(this.save);
    this.sound.play('click');
    this.game?.autoChanged();
  }

  // Aba de informações da defesa (no jogo): aberta ou recolhida
  toggleInfo() {
    this.save.infoOpen = this.save.infoOpen === false;
    writeSave(this.save);
    this.sound.play('click');
  }

  // App foi pro fundo (ligação, troca de app...)
  hidden() {
    this.game?.bankKills();
    this.game?.pause();
    this.sound.suspend();
    analyticsPause();
  }

  shown() {
    this.sound.resume();
    analyticsResume();
  }

  update(dt) {
    if (this.energyUI) this.energyUI.t += dt;
    if (this.payNotice && (this.payNotice.time -= dt) <= 0) this.payNotice = null;
    if (this.next) {
      this.fade = Math.min(1, this.fade + dt * 5);
      if (this.fade >= 1) {
        this.scene = this.next();
        this.next = null;
        // telas abertas (a partida já vai como progressão: Game)
        if (!(this.scene instanceof Game)) trackDesign(`Screen:${this.scene.constructor.name.replace('Scene', '')}`);
        // na partida, a música de batalha da season do mapa; no catálogo, a "Matrix";
        // na loja, a bossa de compras; nos outros menus, a alegre
        this.sound.setTheme?.(
          this.scene instanceof Game
            ? `battle-${this.scene.map.season}`
            : this.scene instanceof CatalogScene
              ? 'catalog'
              : this.scene instanceof ShopScene
                ? 'shop'
                : 'menu',
        );
      }
    } else this.fade = Math.max(0, this.fade - dt * 4);
    this.scene.update(dt);
  }

  render(ctx) {
    this.scene.render(ctx);
    if (this.fade > 0) {
      ctx.fillStyle = `rgba(15,22,48,${this.fade})`;
      ctx.fillRect(0, 0, this.viewW, VIEW_H);
    }
    if (this.energyUI) drawEnergyModal(ctx, this); // por cima de tudo
    if (this.payNotice) this.drawPayNotice(ctx);
  }

  // Aviso das compras, no topo e por cima de tudo
  drawPayNotice(ctx) {
    const n = this.payNotice;
    ctx.save();
    ctx.globalAlpha = Math.min(1, n.time * 3);
    ctx.font = '16px sans-serif';
    const w = Math.min(this.viewW - 40, ctx.measureText(n.text).width * 1.1 + 60);
    rrect(ctx, this.viewW / 2 - w / 2, 84, w, 40, 20);
    fillOutline(ctx, 'rgba(10,20,40,0.92)', 3);
    text(ctx, n.text, this.viewW / 2, 105, { size: 15, color: n.color });
    ctx.restore();
  }

  // ── input ──
  pointerDown(x, y, type) {
    this.sound.unlock();
    if (this.next) return;
    if (this.energyUI) return this.energyTap(x, y);
    this.scene.pointerDown?.(x, y, type);
  }

  pointerMove(x, y, type) {
    if (this.energyUI) return;
    this.scene.pointerMove?.(x, y, type);
  }

  pointerUp(x, y) {
    if (this.next || this.energyUI) return;
    this.scene.pointerUp?.(x, y);
  }

  pointerCancel() {
    this.scene.pointerCancel?.();
  }

  wheel(x, y, dy) {
    if (!this.next) this.scene.wheel?.(x, y, dy);
  }

  pinch(x, y, f, dx, dy) {
    if (!this.next) this.scene.pinch?.(x, y, f, dx, dy);
  }

  // Botão voltar do Android (main.js). Devolve false só na tela inicial
  // (aí o app fecha). Partida: pausa (e despausa); fim de partida: mapas;
  // menus: o mesmo que o Esc (fecha a janela aberta ou volta de tela)
  back() {
    if (this.energyUI) {
      if (this.energyUI.mode === 'empty') this.energyUI = null; // anúncio rolando: espera
      return true;
    }
    if (this.next) return true;
    const s = this.scene;
    if (s instanceof TitleScene) return false;
    if (s instanceof Game && (s.state === 'won' || s.state === 'lost')) {
      if (!(s.endDelay > 0)) this.goMaps(); // igual ao botão MAPAS da tela de fim
    } else this.key('Escape');
    return true;
  }

  key(k) {
    this.sound.unlock();
    if (this.energyUI) {
      if (k === 'Escape' && this.energyUI.mode === 'empty') this.energyUI = null;
      return;
    }
    if (!this.next) this.scene.key?.(k);
  }
}
