// ─────────────────────────────────────────────────────────────
//  INIMIGOS: ameaças digitais
//
//  hp      → vida
//  speed   → pixels por segundo
//  radius  → tamanho (colisão)
//  reward  → dinheiro ao derrotar (entra sozinho no saldo)
//  leak    → vidas que tira se chegar no servidor
//  armored → blindado: Hacker e Roteador não ferem
//  boss    → chefão: trava menos tempo e mostra barra de vida
// ─────────────────────────────────────────────────────────────
export const ENEMIES = {
  virus: { name: 'Vírus', hp: 3, speed: 90, radius: 13, reward: 4, leak: 1 },
  worm: { name: 'Worm', hp: 6, speed: 125, radius: 14, reward: 6, leak: 1 },
  trojan: { name: 'Trojan', hp: 28, speed: 45, radius: 20, reward: 18, leak: 3, armored: true },
  ransomware: { name: 'Ransomware', hp: 240, speed: 28, radius: 30, reward: 100, leak: 20, boss: true },
};
