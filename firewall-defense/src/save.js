// Progresso salvo no navegador (estrelas por mapa, som e turno automático).
// localStorage pode não existir (aba anônima, bloqueado...): aí só não salva.
const KEY = 'firewall-defense-save-v1';

const DEFAULTS = { stars: {}, seen: {}, music: true, sfx: true, autoRound: true };

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, seen: {}, ...JSON.parse(raw) } : { ...DEFAULTS, seen: {} };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeSave(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // sem armazenamento: o jogo segue normal
  }
}
