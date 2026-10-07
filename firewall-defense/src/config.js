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

export const SELL_RATE = 0.7; // vender devolve 70% do que foi gasto
export const MAX_SPEED = 3; // botão de acelerar: 1x → 2x → 3x
export const NEXT_ROUND_DELAY = 1; // turno automático: segundos até a próxima rodada começar (só o tempo do aviso)
export const EARLY_BONUS = 0.15; // chamar com outra rodada rolando: até 15% do valor da próxima (cai conforme a rodada atual acaba)

export const FONT = '"Lilita One", "Arial Rounded MT Bold", "Arial Black", system-ui, sans-serif';

// Cores que se repetem em todo o visual
export const OUTLINE = '#1b2340'; // contorno grosso de tudo (o "look" cartoon)
export const GOLD = '#ffd23f';
export const SKIN = '#f6c9a0';
