import { PAY } from './config.js';
import { COFFEE_PACKS } from './data/consumables.js';
import { writeSave } from './save.js';

/* ════════════════════════════════════════════════════════════
 *  COMPRAS COM DINHEIRO DE VERDADE (pacotes de café e modo VIP)
 *  Quem cobra é o Mercado Pago; quem confirma é o servidor (server/, um
 *  Cloudflare Worker em PAY.api). O jogo só:
 *    1. pede o link de pagamento (buy) e manda o jogador pra lá;
 *    2. ao voltar (e ao abrir o jogo), busca as compras aprovadas desse
 *       jogador e entrega as que ainda não entregou (syncPurchases).
 *  O jogador é identificado por save.playerId (também serve pra recuperar
 *  as compras em outro aparelho). Sem PAY.api a loja fica "EM BREVE".
 * ════════════════════════════════════════════════════════════ */

export const payEnabled = () => !!PAY.api;

// Código do jogador (gerado uma vez e guardado no save)
export function playerId(save) {
  if (!save.playerId) {
    save.playerId = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    writeSave(save);
  }
  return save.playerId;
}

// Abre o pagamento do produto ('pack-s', 'pack-m', 'pack-l' ou 'vip').
// Devolve false se não deu (sem internet, servidor fora...)
export async function buy(app, product) {
  if (!payEnabled()) return false;
  try {
    const res = await fetch(`${PAY.api}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product, player: playerId(app.save) }),
    });
    const { url } = await res.json();
    if (!res.ok || !url) return false;
    location.href = url; // página de pagamento do Mercado Pago (Pix ou cartão)
    return true;
  } catch {
    return false;
  }
}

// Entrega as compras aprovadas que ainda não foram entregues neste save.
// Devolve a lista do que entregou (pra avisar o jogador)
export async function syncPurchases(app) {
  if (!payEnabled()) return [];
  let list;
  try {
    const res = await fetch(`${PAY.api}/purchases?player=${encodeURIComponent(playerId(app.save))}`);
    if (!res.ok) return [];
    ({ purchases: list } = await res.json());
  } catch {
    return [];
  }
  const save = app.save;
  const done = new Set(save.claimed ?? []);
  const got = [];
  for (const p of list ?? []) {
    if (done.has(p.id)) continue;
    const pack = COFFEE_PACKS.find((k) => k.id === p.product);
    if (pack) {
      save.boughtCoffee = (save.boughtCoffee ?? 0) + pack.coffee;
      got.push(`+${pack.coffee} cafés`);
    } else if (p.product === 'vip') {
      app.grantVip();
      got.push('MODO VIP ativado');
    } else continue;
    done.add(p.id);
  }
  if (got.length) {
    save.claimed = [...done];
    writeSave(save);
  }
  return got;
}
