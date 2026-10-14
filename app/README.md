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

## Ícones e abertura
Saem de `firewall-defense/assets/app/` (`python tools/icons.py`), copiados
pra `app/assets/` e gerados com `npx @capacitor/assets generate --android`.

## O que muda no app em relação à web
- Anúncios: AdMob (`src/ads.js`), ainda com o anúncio de teste do Google.
- Loja de dinheiro: "EM BREVE" (a Play só aceita Google Play Billing).
- Botão voltar do Android: `app.back()`.
- Tela cheia sem barras, só deitado.
