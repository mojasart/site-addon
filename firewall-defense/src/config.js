// ─────────────────────────────────────────────────────────────
//  Configurações gerais: tela, economia, fonte e cores base
// ─────────────────────────────────────────────────────────────

// O jogo é desenhado numa resolução "virtual" de altura fixa (540) e depois
// escalado para a tela. A largura se adapta ao formato do celular (de 16:9
// até ~19.5:9). O painel de defesas fica sempre colado na direita.
export const VIEW_H = 540;
export const MIN_VIEW_W = 960;
export const MAX_VIEW_W = 1170;
export const PANEL_W = 190;

// Economia
export const START_MONEY = 650;
export const START_LIVES = 150;
export const SELL_RATE = 0.7; // vender devolve 70% do que foi gasto
export const PACKET_LIFETIME = 14; // segundos até um pacote de bits sumir
export const MAX_SPEED = 3; // botão de acelerar: 1x → 2x → 3x

export const FONT = '"Lilita One", "Arial Rounded MT Bold", "Arial Black", system-ui, sans-serif';

// Cores que se repetem em todo o visual
export const OUTLINE = '#1b2340'; // contorno grosso de tudo (o "look" de jogo mobile)
export const GOLD = '#ffd23f';
