# Play Store — o que já está pronto no código

## Versão
- `src/config.js`: `VERSION` (1.0) + `BUILD` (número de commits, gravado pelo
  GitHub Pages na hora de publicar).
- No app Android (`android/app/build.gradle` do Capacitor):
  - `versionName` = `versionName()` → `"1.0.346"` (o que aparece na loja)
  - `versionCode` = `versionCode()` → `346` (só pode subir; a loja recusa
    igual ou menor)
- Novidade grande: subir `VERSION` (1.1, 2.0). O BUILD continua sozinho.

## Ícones e abertura (`assets/app/`, gerados por `python tools/icons.py`)
| Arquivo | Uso |
|---|---|
| `icon-512.png` | ícone da ficha da Play Store (512×512) e do manifest |
| `icon-192.png` | manifest / atalho |
| `icon-maskable-512.png` | ícone adaptável (PWA): desenho dentro da zona segura |
| `icon-foreground-1024.png` + `icon-background-1024.png` | ícone adaptável do Android (camadas da frente e de trás) |
| `icon-1024.png` | ícone base |
| `apple-touch-icon.png` | iPhone |
| `splash-2732.png` | tela de abertura |

Com Capacitor: copiar pra `resources/` como `icon-only.png`,
`icon-foreground.png`, `icon-background.png`, `splash.png` e rodar
`npx @capacitor/assets generate --android`.

## Botão voltar do Android
`app.back()` (src/app.js): partida → pausa/despausa; fim de partida → mapas;
menus → fecha a janela aberta ou volta de tela; tela inicial → sai do app.
No app usa o plugin `@capacitor/app` (`backButton`); no navegador, o histórico.

## Fonte
Lilita One vem em `assets/fonts/` (licença SIL OFL, `OFL.txt`). Sem internet
o jogo continua com a fonte certa.

## Bordas da tela
`viewport-fit=cover` + `#stage` com `env(safe-area-inset-*)`: o jogo fica
fora do recorte da câmera e dos cantos arredondados.

## Save
Só no aparelho (`localStorage`). Desinstalar apaga. Salvar na nuvem é
opcional (precisa de login do Google Play Games ou de um servidor).
