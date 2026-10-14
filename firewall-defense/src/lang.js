// Idioma atual do jogo: 'pt' (português) ou 'en' (inglês).
// Módulo sem dependências: util.js e i18n.js leem daqui (quem troca o
// idioma de verdade é o setLang do i18n.js, que também traduz os dados)
let current = 'pt';

export const lang = () => current;
export const isEn = () => current === 'en';
export const locale = () => (current === 'en' ? 'en-US' : 'pt-BR');

export function setCurrentLang(l) {
  current = l === 'en' ? 'en' : 'pt';
}
