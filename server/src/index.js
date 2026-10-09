// ─────────────────────────────────────────────────────────────
//  SERVIDOR DE COMPRAS (Cloudflare Worker + Mercado Pago Checkout Pro)
//
//  O jogo é um site estático: ele não pode guardar a chave do Mercado
//  Pago nem confirmar pagamento sozinho. Este Worker faz as duas coisas:
//
//    POST /checkout   { product, player }  → cria a cobrança no Mercado Pago e
//                                            devolve { url } (página de pagamento)
//    POST /webhook                         ← o Mercado Pago avisa aqui quando um
//                                            pagamento muda; aprovado → grava a compra
//    GET  /purchases?player=ID             → compras aprovadas desse jogador
//                                            (o jogo entrega o que ainda não entregou)
//
//  player = código do jogador (save.playerId), que também serve pra
//  recuperar as compras em outro aparelho.
//
//  Segredos (nunca no Git; `npx wrangler secret put NOME`):
//    MP_ACCESS_TOKEN    → Access Token do Mercado Pago (TEST-... no modo teste)
//    MP_WEBHOOK_SECRET  → assinatura secreta dos webhooks (opcional, recomendado)
//  Variável (wrangler.toml): SITE_URL → pra onde o jogador volta depois de pagar
//  KV (wrangler.toml): PURCHASES → as compras aprovadas
// ─────────────────────────────────────────────────────────────

// O que se vende. O preço que vale é o daqui (o jogo só mostra o texto).
// Tem que bater com COFFEE_PACKS / VIP em firewall-defense/src/data/consumables.js
export const PRODUCTS = {
  'pack-s': { title: 'Firewall Defense: +10 cafés', price: 4.9 },
  'pack-m': { title: 'Firewall Defense: +30 cafés', price: 9.9 },
  'pack-l': { title: 'Firewall Defense: +100 cafés', price: 24.9 },
  vip: { title: 'Firewall Defense: Modo VIP', price: 35 },
};

const MP = 'https://api.mercadopago.com';
const PLAYER_RE = /^[a-z0-9-]{8,64}$/i;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const c = (res) => cors(res, env, req);
    if (req.method === 'OPTIONS') return c(new Response(null, { status: 204 }));
    try {
      if (req.method === 'POST' && url.pathname === '/checkout') return c(await checkout(req, env, url));
      if (req.method === 'POST' && url.pathname === '/webhook') return await webhook(req, env, url);
      if (req.method === 'GET' && url.pathname === '/purchases') return c(await purchases(env, url));
      return c(json({ error: 'not found' }, 404));
    } catch (err) {
      console.log('erro:', err?.stack ?? err);
      return c(json({ error: 'server' }, 500));
    }
  },
};

// Cria a cobrança (preferência do Checkout Pro) e devolve o link de pagamento
async function checkout(req, env, url) {
  const { product, player } = await req.json().catch(() => ({}));
  const item = PRODUCTS[product];
  if (!item || !PLAYER_RE.test(player ?? '')) return json({ error: 'pedido inválido' }, 400);
  const back = (status) => `${env.SITE_URL}?compra=${status}`;
  const res = await fetch(`${MP}/checkout/preferences`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ id: product, title: item.title, quantity: 1, unit_price: item.price, currency_id: 'BRL' }],
      external_reference: `${player}:${product}`,
      back_urls: { success: back('ok'), pending: back('pendente'), failure: back('falhou') },
      auto_return: 'approved',
      notification_url: `${url.origin}/webhook`,
      statement_descriptor: 'FIREWALLDEF',
    }),
  });
  if (!res.ok) {
    console.log('Mercado Pago recusou a preferência:', res.status, await res.text());
    return json({ error: 'pagamento indisponível' }, 502);
  }
  const pref = await res.json();
  return json({ url: pref.init_point });
}

// Aviso do Mercado Pago: busca o pagamento na API (não confia no corpo do aviso)
// e, se aprovado, grava a compra. Sempre responde 200 pra ele não repetir à toa
async function webhook(req, env, url) {
  const body = await req.json().catch(() => ({}));
  const id = url.searchParams.get('data.id') ?? body?.data?.id;
  const type = url.searchParams.get('type') ?? body?.type;
  if (type !== 'payment' || !id) return new Response('ok');
  if (env.MP_WEBHOOK_SECRET && !(await signatureOk(req, env.MP_WEBHOOK_SECRET, id))) return new Response('assinatura inválida', { status: 401 });

  const res = await fetch(`${MP}/v1/payments/${id}`, { headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` } });
  if (!res.ok) return new Response('ok');
  const pay = await res.json();
  if (pay.status !== 'approved') return new Response('ok');
  const [player, product] = String(pay.external_reference ?? '').split(':');
  const item = PRODUCTS[product];
  // confere o valor pago com o preço (ninguém compra o VIP pelo preço do pacote pequeno)
  if (!item || !PLAYER_RE.test(player ?? '') || Number(pay.transaction_amount) + 0.001 < item.price) return new Response('ok');
  await env.PURCHASES.put(`p:${player}:${pay.id}`, JSON.stringify({ product, at: pay.date_approved }));
  return new Response('ok');
}

// Compras aprovadas do jogador: [{ id, product }]
async function purchases(env, url) {
  const player = url.searchParams.get('player') ?? '';
  if (!PLAYER_RE.test(player)) return json({ error: 'jogador inválido' }, 400);
  const list = await env.PURCHASES.list({ prefix: `p:${player}:` });
  const out = [];
  for (const k of list.keys) {
    const v = JSON.parse((await env.PURCHASES.get(k.name)) ?? '{}');
    out.push({ id: k.name.split(':')[2], product: v.product });
  }
  return json({ purchases: out });
}

// Assinatura do webhook (x-signature: "ts=...,v1=..."): HMAC-SHA256 de
// "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" com o segredo
async function signatureOk(req, secret, id) {
  const sig = Object.fromEntries((req.headers.get('x-signature') ?? '').split(',').map((p) => p.trim().split('=')));
  const manifest = `id:${String(id).toLowerCase()};request-id:${req.headers.get('x-request-id') ?? ''};ts:${sig.ts ?? ''};`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return !!sig.v1 && hex === sig.v1;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

// Só o site do jogo (e o servidor de teste local) pode chamar:
// ALLOW_ORIGIN é uma lista separada por vírgula
function cors(res, env, req) {
  const h = new Headers(res.headers);
  const allowed = (env.ALLOW_ORIGIN ?? '*').split(',').map((s) => s.trim());
  const origin = req.headers.get('Origin') ?? '';
  h.set('Access-Control-Allow-Origin', allowed.includes('*') ? '*' : allowed.includes(origin) ? origin : allowed[0]);
  h.set('Vary', 'Origin');
  h.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type');
  return new Response(res.body, { status: res.status, headers: h });
}
