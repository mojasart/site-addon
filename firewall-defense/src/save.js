// Configurações salvas no navegador (som e vibração).
// localStorage pode não existir (aba anônima, bloqueado...): aí só não salva.
const KEY = 'firewall-defense-settings-v1';

const DEFAULTS = { sound: true, vibration: true };

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // sem armazenamento: o jogo segue normal
  }
}
