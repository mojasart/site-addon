// ─────────────────────────────────────────────────────────────
//  Configurações gerais: layout do tabuleiro + economia
// ─────────────────────────────────────────────────────────────

// O jogo é desenhado numa resolução "virtual" de altura fixa (540) e depois
// escalado para a tela. A largura se adapta ao formato do celular (de 16:9
// até ~19.5:9) para não sobrar faixa preta nas laterais.
export const VIEW_H = 540;
export const MIN_VIEW_W = 960;
export const MAX_VIEW_W = 1170;

// Tabuleiro: 5 linhas de rede x 9 colunas
export const ROWS = 5;
export const COLS = 9;
export const CELL_W = 90;
export const CELL_H = 86;
export const HUD_H = 94;
export const BOARD_X = 120;
export const BOARD_Y = 100;
export const BOARD_RIGHT = BOARD_X + COLS * CELL_W; // 930
export const BOARD_BOTTOM = BOARD_Y + ROWS * CELL_H; // 530

export const CORE_X = 40; // inimigo que passar daqui invade o núcleo = derrota
export const BACKUP_X = 80; // posição dos backups (o "cortador de grama" de cada linha)
export const SPAWN_X = MAX_VIEW_W + 40; // inimigos nascem fora da tela

// Economia
export const START_BITS = 50;
export const PACKET_VALUE = 25;
export const SKY_PACKET_INTERVAL = 10; // segundos entre pacotes que "caem" da rede
export const PACKET_LIFETIME = 9; // segundos até um pacote parado sumir
export const HUD_BITS_POS = { x: 56, y: 36 }; // pra onde o pacote voa ao ser coletado

export const FONT = 'ui-monospace, "SF Mono", Menlo, Consolas, "Roboto Mono", monospace';

export const rowY = (row) => BOARD_Y + row * CELL_H + CELL_H / 2;
export const colX = (col) => BOARD_X + col * CELL_W + CELL_W / 2;

export function cellAt(x, y) {
  if (x < BOARD_X || x >= BOARD_RIGHT || y < BOARD_Y || y >= BOARD_BOTTOM) return null;
  return {
    row: Math.floor((y - BOARD_Y) / CELL_H),
    col: Math.floor((x - BOARD_X) / CELL_W),
  };
}
