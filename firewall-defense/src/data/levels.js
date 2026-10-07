// ─────────────────────────────────────────────────────────────
//  FASES
//
//  waves: lista de ondas, em ordem.
//    delay   → segundos depois da onda anterior (a 1ª conta do início)
//    enemies → ids de data/enemies.js (entram em linhas aleatórias)
//    big     → onda grande: mostra alerta e os inimigos entram rápido
//    banner  → texto do alerta (opcional)
// ─────────────────────────────────────────────────────────────
export const LEVELS = [
  {
    name: 'Fase 1: Rede Doméstica',
    startBits: 50,
    defenders: ['minerador', 'antivirus', 'firewall', 'criptografia', 'honeypot'],
    waves: [
      { delay: 25, enemies: ['virus'] },
      { delay: 22, enemies: ['virus'] },
      { delay: 20, enemies: ['virus', 'virus'] },
      { delay: 20, enemies: ['worm', 'virus'] },
      { delay: 22, enemies: ['virus', 'trojan', 'virus'] },
      { delay: 22, enemies: ['worm', 'worm', 'virus', 'virus'] },
      { delay: 24, enemies: ['trojan', 'virus', 'worm', 'virus', 'virus'] },
      { delay: 24, enemies: ['trojan', 'trojan', 'virus', 'worm', 'virus'] },
      {
        delay: 26,
        big: true,
        banner: 'ATAQUE MASSIVO DETECTADO!',
        enemies: ['ransomware', 'trojan', 'trojan', 'virus', 'virus', 'virus', 'worm', 'worm', 'virus'],
      },
    ],
  },
];
