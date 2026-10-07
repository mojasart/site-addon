// ─────────────────────────────────────────────────────────────
//  Configurações gerais: tela, fonte e cor de contorno
// ─────────────────────────────────────────────────────────────

// O jogo é desenhado numa resolução "virtual" de altura fixa (540) e depois
// escalado para a tela. A largura se adapta ao formato do celular (de 16:9
// até ~19.5:9). O mapa é projetado para 960 de largura e fica centralizado;
// em telas mais largas sobra só chão nas laterais.
export const VIEW_H = 540;
export const MIN_VIEW_W = 960;
export const MAX_VIEW_W = 1170;
export const LEVEL_W = 960;

export const FONT = '"Lilita One", "Arial Rounded MT Bold", "Arial Black", system-ui, sans-serif';

// Contorno usado em todo o jogo (personagens, inimigos, UI)
export const INK = '#2b2340';
