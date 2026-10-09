# Servidor de compras (Mercado Pago + Cloudflare Workers)

O jogo é um site estático (GitHub Pages): ele não pode guardar a chave do Mercado Pago nem confirmar
pagamentos. Este servidorzinho faz isso. Ele **não** é publicado junto com o jogo (o Pages só publica
`firewall-defense/`).

Como funciona:

1. O jogador toca num pacote de café (ou no VIP) na loja → o jogo chama `POST /checkout` → o servidor
   cria a cobrança no Mercado Pago e devolve o link → o jogador paga (Pix ou cartão) na página do
   Mercado Pago.
2. O Mercado Pago avisa o servidor (`POST /webhook`) → o servidor confere o pagamento direto na API
   do Mercado Pago (status aprovado e valor certo) e grava a compra no KV.
3. O jogador volta pro jogo (`?compra=ok`) → o jogo busca as compras dele (`GET /purchases`) e entrega
   as que ainda não entregou (`src/pay.js`).

O jogador é identificado por um código (`save.playerId`), gerado no primeiro acesso.

## Colocando no ar (modo teste)

Feito por você, com as suas contas (nunca cole tokens no chat nem em arquivo do Git):

1. **Mercado Pago:** crie a conta (CPF serve) e entre em <https://www.mercadopago.com.br/developers>
   → *Suas integrações* → *Criar aplicação* (produto: Checkout Pro). Em *Credenciais de teste*, copie
   o **Access Token** (começa com `TEST-`). Em *Contas de teste*, crie um **vendedor** e um **comprador**
   de teste (pra pagar sem dinheiro de verdade).
2. **Cloudflare:** crie uma conta grátis em <https://dash.cloudflare.com/sign-up>.
3. No terminal, dentro de `server/`:

   ```bash
   npx wrangler login
   npx wrangler kv namespace create PURCHASES
   ```

   Cole o `id` que ele mostrar em `wrangler.toml` (no lugar de `COLE_AQUI_O_ID_DO_KV`).

   ```bash
   npx wrangler secret put MP_ACCESS_TOKEN
   npx wrangler deploy
   ```

   (o `secret put` pede o token: cole o `TEST-...` ali, no terminal). O `deploy` mostra o endereço,
   tipo `https://firewall-defense-pay.SEU-USUARIO.workers.dev`.
4. No jogo, ponha esse endereço em `PAY.api` (`firewall-defense/src/config.js`). A loja deixa de
   mostrar "EM BREVE" e os pacotes abrem o pagamento.
5. (Recomendado) No painel do Mercado Pago, em *Webhooks*, configure a URL
   `https://firewall-defense-pay.SEU-USUARIO.workers.dev/webhook` (evento *Pagamentos*), copie a
   *assinatura secreta* e rode `npx wrangler secret put MP_WEBHOOK_SECRET`.

Pra vender de verdade: troque o token de teste pelo de **produção** (`npx wrangler secret put
MP_ACCESS_TOKEN` de novo). O dinheiro cai na conta do Mercado Pago, e de lá dá pra sacar pro banco/Pix.

## Preços

Ficam em `PRODUCTS` (`src/index.js`). O texto que o jogo mostra fica em `COFFEE_PACKS` / `VIP`
(`firewall-defense/src/data/consumables.js`): mudou um, mude o outro.
