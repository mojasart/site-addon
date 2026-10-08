// Progresso salvo no navegador (estrelas e platina por mapa, cafés gastos na
// Dark Net, som e turno automático).
// localStorage pode não existir (aba anônima, bloqueado...): aí só não salva.
const KEY = 'firewall-defense-save-v1';

const DEFAULTS = { stars: {}, platinum: {}, seen: {}, coffeeSpent: 0, kills: 0, duckCoffee: 0, darknet: {}, music: true, sfx: true, autoRound: true, infoOpen: true };

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, seen: {}, platinum: {}, ...JSON.parse(raw) } : { ...DEFAULTS, seen: {}, platinum: {} };
  } catch {
    return { ...DEFAULTS };
  }
}

// Modo debug: o save vira só uma cópia na memória e nada é gravado
let paused = false;
export function pauseSaving() {
  paused = true;
}

export function writeSave(save) {
  if (paused) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // sem armazenamento: o jogo segue normal
  }
}
