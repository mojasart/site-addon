// ─────────────────────────────────────────────────────────────
//  Configurações gerais: tela, regras globais, fonte e cores base
// ─────────────────────────────────────────────────────────────

// O jogo é desenhado numa resolução "virtual" de altura fixa (540) e depois
// escalado para a tela. A largura se adapta ao formato do celular (de 16:9
// até ~19.5:9). O painel de defesas fica sempre colado na direita.
// O mapa é uma grade de COLS × ROWS quadrados de TILE px (core/grid.js):
// o caminho tem 1 quadrado de largura e cada defesa ocupa 1 quadrado.
export const TILE = 54;
export const COLS = 14;
export const ROWS = 10;
export const VIEW_H = ROWS * TILE; // 540
export const MAP_W = COLS * TILE; // 756: largura do mapa (data/maps.js)
export const PANEL_W = 190;
export const MIN_VIEW_W = MAP_W + PANEL_W; // 946: na tela mais estreita o mapa ocupa tudo
export const MAX_VIEW_W = 1170;

// Vida de uma camada de vírus (o dano básico de um ataque também é dessa ordem:
// Hacker 1000 por teclado). Escala grande pra buff de 10% fazer sentido
export const LAYER_HP = 1000;
// Versão do jogo, mostrada na tela inicial como vVERSION.BUILD (v1.0.345).
// BUILD = número de commits: o GitHub Pages grava na hora de publicar
// (.github/workflows/pages.yml); aqui fica o da última vez que alguém mudou
export const VERSION = '1.0';
export const BUILD = 346;
export const versionLabel = () => `v${VERSION}.${String(BUILD).padStart(3, '0')}`;

// Energia: cada partida gasta 1 ao passar da 1ª onda; volta 1 a cada regenMin
// minutos até max; sem energia, um anúncio de adTime s dá +ad
export const ENERGY = { max: 10, regenMin: 12, ad: 5, adTime: 5 }; // ad: energias por anúncio; adTime: duração do anúncio simulado (s)
export const SELL_RATE = 0.7; // vender devolve 70% do que foi gasto
export const SPEEDS = [1, 2, 3]; // botão de acelerar: 1x → 2x → 3x
export const TURBO_SPEED = 5; // a mais no fim da lista com a Placa-Mãe (season 1) toda platinada
// Toque do jogador num vírus: dano em 1 vírus por toque (o mais perto do
// dedo). Spyware escondido não leva; folga em px em volta do vírus pra acertar
export const TAP = { damage: 500, slackTouch: 14, slackMouse: 6, splash: 90 }; // splash: até onde o Respingo (Dark Net) alcança o vizinho
export const DANGER_TILES = 3; // acelerado: volta pra 1x quando um vírus que faz perder está a menos disso (quadrados de caminho) da base
// Primeiras ondas do modo normal: a pressão do mapa corta a quantidade de vírus
// (0,2 a 0,5) e elas vinham quase vazias. A 1ª onda vem com `mul` da quantidade
// original (no máximo `max` × a pressão do mapa, senão os mapas de pressão
// baixa quebram cedo), caindo até a pressão do mapa na onda `waves` + 1
// (em ondas do modo normal: map.waves, de 15 a 40)
export const EARLY_WAVES = { mul: 0.7, waves: 18, max: 2.5 };
export const EARLY_BONUS = 0.75; // chamar com outra rodada rolando: até 75% do valor da próxima (cai conforme a rodada atual acaba)

export const FONT = '"Lilita One", "Arial Rounded MT Bold", "Arial Black", system-ui, sans-serif';

// Cores que se repetem em todo o visual
export const OUTLINE = '#1b2340'; // contorno grosso de tudo (o "look" cartoon)
export const GOLD = '#ffd23f';
export const SKIN = '#f6c9a0';

// Modo debug (?debug ou tocar no worm da tela inicial): cafés da Dark Net
export const DEBUG = { coffee: 9999999 };
// Compras com dinheiro de verdade (src/pay.js): endereço do servidor de
// compras (server/, Cloudflare Worker). Vazio = loja "EM BREVE", sem vender
export const PAY = { api: 'https://firewall-defense-pay.firewall-defense.workers.dev' };
