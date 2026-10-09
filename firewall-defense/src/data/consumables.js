// ─────────────────────────────────────────────────────────────
//  CONSUMÍVEIS
//  Itens comprados com café na loja (scenes/ShopScene.js) que ficam no
//  inventário (save.inventory: { id: quantidade }) e são gastos durante a
//  partida (aba de itens do painel). Cada item:
//    id     → chave no inventário
//    name   → nome curto (cabe no painel da partida)
//    desc   → o que faz
//    cost   → preço em cafés
//    color  → cor do card
//    use(game) → aplica na partida; devolve false se não dá pra usar agora
//               (aí não gasta o item)
//  O desenho de cada item fica em render/consumables.js (drawItemIcon).
// ─────────────────────────────────────────────────────────────
export const CASH = 300; // Bitcoin Extra: dinheiro na hora
export const FREEZE_TIME = 5; // Congelar Tudo: segundos parados (chefão só fica lento)
export const BACKUP_LIVES = 5; // Backup: vidas a mais (na platina não dá pra usar item)

export const CONSUMABLES = [
  {
    id: 'cash',
    name: 'Bitcoin Extra',
    desc: `Ganha $${CASH} na hora`,
    cost: 2,
    color: '#ffc62e',
    use(game) {
      if (game.bounty) return false; // Bug Bounty: só o orçamento
      game.money += CASH;
      game.coinBump = 1;
      return true;
    },
  },
  {
    id: 'free',
    name: 'Defesa Grátis',
    desc: 'A próxima defesa que você colocar sai de graça',
    cost: 3,
    color: '#3fd16b',
    use(game) {
      if (game.freeTower) return false; // já tem uma grátis esperando
      game.freeTower = true;
      return true;
    },
  },
  {
    id: 'freeze',
    name: 'Congelar Tudo',
    desc: `Todos os vírus ficam congelados por ${FREEZE_TIME}s (chefões só ficam lentos)`,
    cost: 3,
    color: '#5fd0ff',
    use(game) {
      const alive = game.enemies.filter((e) => !e.dead);
      if (!alive.length) return false; // nada pra congelar
      for (const e of alive) {
        if (!e.freeze(FREEZE_TIME)) e.slow(0.4, FREEZE_TIME); // chefão não congela
        game.fx.spark(e.x, e.y - e.r, '#c8f4ff', 9);
      }
      game.shake(3);
      return true;
    },
  },
  {
    id: 'lives',
    name: 'Backup',
    desc: `+${BACKUP_LIVES} vidas`,
    cost: 4,
    color: '#ff6f8a',
    use(game) {
      game.lives += BACKUP_LIVES;
      game.hurt = 0;
      return true;
    },
  },
];

export const ITEM = Object.fromEntries(CONSUMABLES.map((c) => [c.id, c]));

// Pacotes de café com dinheiro de verdade: ainda NÃO vendem (precisam de um
// meio de pagamento e de um servidor pra validar a compra). A loja mostra
// como "EM BREVE" e não cobra nem pede nada.
export const COFFEE_PACKS = [
  // sprite: desenho do pacote (assets/sprites): grãos, xícara e saco de café
  { id: 'pack-s', coffee: 10, price: 'R$ 4,90', sprite: 'coffee_beans' },
  { id: 'pack-m', coffee: 30, price: 'R$ 9,90', sprite: 'coffee_cup' },
  { id: 'pack-l', coffee: 100, price: 'R$ 24,90', sprite: 'coffee_sack' },
];

// Modo VIP (dinheiro de verdade, "em breve" como os pacotes): ganha `coffee`
// cafés na hora e energia infinita pra sempre (save.vip; app.grantVip)
export const VIP = { coffee: 100, price: 'R$ 35,00' };

// Usa um item do inventário na partida: aplica o efeito e gasta 1.
// Devolve true se usou. É o que a aba de itens do painel chama.
export function useConsumable(game, id) {
  const item = ITEM[id];
  const app = game.app;
  // na platina não vale item nenhum
  if (!item || game.platinum || game.state !== 'playing' || !((app.inventory?.[id] ?? 0) > 0)) return false;
  if (!item.use(game)) {
    game.sound.play('error');
    return false;
  }
  app.consumeItem(id);
  game.sound.play('upgrade');
  return true;
}
