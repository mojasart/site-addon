// ─────────────────────────────────────────────────────────────
//  Monta app/www (o que vai dentro do app Android) a partir de
//  firewall-defense/, sem mexer no jogo da web:
//    - BUILD = número de commits (igual ao GitHub Pages), no config.js
//    - capacitor.js antes do jogo (src/native.js usa o window.Capacitor)
//    - sem o script de anúncios da web (H5 Games Ads não vale em app;
//      no app quem mostra anúncio é o AdMob)
//    - versionCode / versionName do Android em android/app/version.properties
//  Rodar com `npm run sync` (ou `npm run apk` / `npm run aab`), dentro de app/
// ─────────────────────────────────────────────────────────────
import { cpSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const game = join(here, '..', 'firewall-defense');
const www = join(here, 'www');

rmSync(www, { recursive: true, force: true });
cpSync(game, www, { recursive: true, filter: (src) => !src.endsWith('.md') });

// versão
const build = Number(execSync('git rev-list --count HEAD', { cwd: here }).toString().trim());
const configPath = join(www, 'src', 'config.js');
let config = readFileSync(configPath, 'utf8');
config = config.replace(/^export const BUILD = .*$/m, `export const BUILD = ${build};`);
writeFileSync(configPath, config);
const version = config.match(/^export const VERSION = '([^']+)'/m)[1];
mkdirSync(join(here, 'android', 'app'), { recursive: true });
writeFileSync(join(here, 'android', 'app', 'version.properties'), `versionCode=${build}\nversionName=${version}.${build}\n`);

// index.html do app
const indexPath = join(www, 'index.html');
let html = readFileSync(indexPath, 'utf8');
const ads = /\s*<!-- Anúncios com recompensa[\s\S]*?<\/script>\s*<script>[\s\S]*?<\/script>/;
if (!ads.test(html)) throw new Error('não achei o bloco de anúncios da web no index.html');
html = html.replace(ads, '');
html = html.replace('<script type="module" src="src/main.js"></script>', '<script src="capacitor.js"></script>\n  <script type="module" src="src/main.js"></script>');
writeFileSync(indexPath, html);
cpSync(join(here, 'node_modules', '@capacitor', 'core', 'dist', 'capacitor.js'), join(www, 'capacitor.js'));

console.log(`www pronto: versão ${version}.${build} (versionCode ${build})`);
