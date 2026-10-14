# Respostas prontas pra Play Console

Quando a conta for aprovada: criar o app e ir copiando daqui. Vale pro app
Android como ele está hoje (AdMob + compras pelo Google Play Billing quando
entrar). Se mudar algo no jogo (login, nuvem, analytics), revisar.

## Criar app
- Nome: **Firewall Defense**
- Idioma padrão: **Português (Brasil)**
- App ou jogo: **Jogo** · Gratuito ou pago: **Gratuito**
- ID do pacote (vem do AAB): `com.mojasart.firewalldefense`

## Política de privacidade
`https://mojasart.github.io/site-addon/privacidade.html`

## Acesso ao app
**Todas as funcionalidades estão disponíveis sem acesso especial** (não tem login).

## Anúncios
**Sim, o app contém anúncios** (AdMob, com recompensa).

## Classificação do conteúdo (questionário IARC)
- Categoria: **Jogo**
- Violência: **sim, fantasia/cartoon leve** (defesas estouram vírus de desenho animado; sem sangue, sem pessoas machucadas)
- Medo, sexo, linguagem imprópria, drogas, álcool, tabaco: **não**
- Jogos de azar / apostas simuladas: **não**
- Interação entre usuários / chat / compartilha localização: **não**
- Compras digitais: **sim**
- Resultado esperado: Livre ou 10 anos

## Público-alvo e conteúdo
- Faixa etária: **13-15, 16-17 e 18+** (deixar menores de 13 de fora)
- "O app pode atrair crianças?": responder com sinceridade. Se marcar que
  pode, a Google pode exigir a Política de Famílias (anúncios só de redes
  certificadas pra crianças, sem ID de publicidade). Marcar menores de 13
  muda bastante coisa: falar comigo antes.

## Segurança dos dados (Data safety)
**O app coleta ou compartilha dados?** Sim.
**Os dados são criptografados em trânsito?** Sim (tudo por HTTPS).
**Dá pra pedir exclusão dos dados?** Sim (pelo contato da política; o
progresso fica no aparelho e some ao desinstalar).

| Tipo de dado | Coletado | Compartilhado | Por quê | Obrigatório? |
|---|---|---|---|---|
| IDs do dispositivo ou outros (ID de publicidade) | Sim (SDK do AdMob) | Sim (Google) | Publicidade, Análise | Sim |
| Localização aproximada (pelo IP) | Sim (SDK do AdMob) | Sim (Google) | Publicidade | Sim |
| Interações com o app | Sim (SDK do AdMob) | Sim (Google) | Publicidade, Análise | Sim |
| Diagnóstico (falhas, desempenho) | Sim (SDK do AdMob) | Não | Análise | Sim |
| Histórico de compras | Sim (servidor de compras: código aleatório + produto) | Não | Funcionalidade do app | Só quem compra |

Nome, e-mail, contatos, fotos, arquivos, localização precisa: **não coleta**.
O apelido do jogador fica só no aparelho (não conta como coletado).

## Teste fechado (conta pessoal nova)
Antes de publicar: **teste fechado com pelo menos 12 testadores por 14
dias seguidos**. Juntar os e-mails (conta Google com Android) desde já.

## AdMob (pra ativar os anúncios de verdade)
1. Criar conta em admob.google.com (pede dados de pagamento/impostos).
2. Apps → Adicionar app → Android → "O app não está publicado" → nome Firewall Defense.
3. Blocos de anúncios → **Premiado** (rewarded) → nome "energia".
4. Me passar o **ID do app** (`ca-app-pub-…~…`) e o **ID do bloco** (`ca-app-pub-…/…`).
   Eu troco no `app/android/app/src/main/AndroidManifest.xml` e no `ADMOB` do
   `firewall-defense/src/config.js` (test: false).
5. Depois de publicado na Play, ligar o app do AdMob à página da loja e
   publicar o `app-ads.txt` no site do desenvolvedor.
6. Mensagens de privacidade e consentimento (AdMob → Privacidade e
   mensagens): criar a mensagem do GDPR. O jogo já chama o formulário.
