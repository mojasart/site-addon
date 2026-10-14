// Inglês: textos da interface (por texto em português) e dos dados (por id).
// Cada área do jogo tem o seu arquivo; aqui só junta tudo (ver src/i18n.js)
import scenes from './scenes.js';
import game from './game.js';
import render from './render.js';
import ui from './ui-data.js';
import notify from './notify.js';
export { DATA } from './data.js';

export const UI = { ...ui, ...render, ...game, ...scenes, ...notify };
