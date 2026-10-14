// ─────────────────────────────────────────────────────────────
//  App Android (Capacitor, pasta app/ do repo)
//
//  No app, o app/build.mjs põe o capacitor.js antes do jogo e ele cria o
//  window.Capacitor, que fala com o lado nativo (plugins instalados no
//  app/package.json). No navegador nada disso existe: isNative fica false e
//  cada parte do jogo segue o caminho da web.
// ─────────────────────────────────────────────────────────────
const Cap = window.Capacitor;

export const isNative = !!Cap?.isNativePlatform?.();

const plugins = {};

// Plugin nativo pelo nome ('App', 'AdMob'...); null fora do app
export function plugin(name) {
  if (!isNative) return null;
  return (plugins[name] ??= Cap.registerPlugin(name));
}
