# App Android (Capacitor)

O jogo continua sendo só `firewall-defense/` (HTML + JavaScript). Esta pasta
embrulha ele num app Android: o Capacitor abre o jogo num WebView em tela
cheia e liga os plugins nativos (botão voltar, AdMob).

## Comandos (dentro de `app/`)
```
npm install          # só na primeira vez
npm run apk          # APK de teste: android/app/build/outputs/apk/debug/app-debug.apk
npm run aab          # pacote da Play: android/app/build/outputs/bundle/release/app-release.aab
```
Precisa do Android Studio instalado (o Gradle usa o Java dele):
`JAVA_HOME=C:/Program Files/Android/Android Studio/jbr`.
Se o Gradle der "Unable to establish loopback connection", aponte a pasta
temporária do Java pra um caminho simples:
`JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=C:/Users/<você>/.gradle-uds`.

O `npm run sync` (chamado pelos dois) roda o `build.mjs`, que copia o jogo
pra `www/` com a versão certa (BUILD = número de commits), põe o
`capacitor.js` e tira o script de anúncios da web.

## Versão
`versionName` = `1.0.<BUILD>` e `versionCode` = `<BUILD>`, gravados em
`android/app/version.properties` a cada build. A Play recusa versionCode
repetido: cada envio precisa de commit novo.

## Assinatura
A chave de upload fica fora do repositório, em
`~/.android-keys/firewall-defense-upload.jks`, com as senhas em
`~/.android-keys/firewall-defense.properties`. **Faça backup dessa pasta**
(pendrive, cofre de senhas). No primeiro envio, deixe a Play gerenciar a
chave de assinatura do app (Play App Signing): aí, se a chave de upload
sumir, dá pra pedir troca pro Google.

## Build automático (GitHub Actions)
A cada push na main que mexe no jogo ou no app, o GitHub gera o app
(`.github/workflows/android.yml`). Os arquivos ficam na execução, em
**Actions → App Android → (a execução) → Artifacts**, por 30 dias:
- `firewall-defense-<versão>.aab`: o pacote pra enviar na Play Console;
- `firewall-defense-<versão>.apk`: pra instalar direto no celular.

Sem a chave cadastrada no GitHub, ele gera só um APK de teste
(`…-teste.apk`). Pra ter o pacote da Play assinado, cadastre **uma vez**
os dois secrets do repositório. No Git Bash do PC onde a chave foi criada
(o `gh` já está logado), rode os dois comandos (nenhum mostra a senha na tela):
```
base64 -w0 ~/.android-keys/firewall-defense-upload.jks | gh secret set ANDROID_KEYSTORE_BASE64 -R mojasart/site-addon
grep '^storePassword=' ~/.android-keys/firewall-defense.properties | cut -d= -f2- | tr -d '\r\n' | gh secret set ANDROID_KEYSTORE_PASSWORD -R mojasart/site-addon
```
Depois, em **Actions → App Android → Run workflow**, roda na hora (ou
espera o próximo push). Conferir os secrets: `gh secret list -R mojasart/site-addon`.

O repositório é público, mas secrets não aparecem pra ninguém (nem nos
logs) e não vão pra PRs de fora. O build grava a chave só na máquina
temporária do GitHub e apaga no fim.

O APK assinado usa a chave de upload. Quem instalar ele e depois quiser a
versão da Play Store vai precisar desinstalar antes (a Play assina com a
chave dela).

## Ícones e abertura
Saem de `firewall-defense/assets/app/` (`python tools/icons.py`), copiados
pra `app/assets/` e gerados com `npx @capacitor/assets generate --android`.

## O que muda no app em relação à web
- Anúncios: AdMob (`src/ads.js`), com o bloco premiado de verdade (`ADMOB` no
  `config.js`; `test: true` volta pro anúncio de teste do Google).
- Loja de dinheiro: "EM BREVE" (a Play só aceita Google Play Billing).
- Botão voltar do Android: `app.back()`.
- Tela cheia sem barras, só deitado.
