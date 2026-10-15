import { ANIMALS, COLORS, CONFIG } from '../../../shared/config';
/** Small vector portraits share the approved animals' identifying face features. */
export function animalIcon(animal: number): string {
  const parts = [
    '<path fill="#EE4266" d="M24 17V7h8v6h8v8"/><rect x="14" y="18" width="36" height="34" rx="8" fill="#FFF6E5"/><path fill="#FFD23F" d="m25 37 7 12 8-12Z"/>',
    '<rect x="10" y="22" width="44" height="30" rx="10" fill="#6BCB77"/><path fill="#6BCB77" d="M13 28V13h15v15m8 0V13h15v15"/><path fill="none" d="m24 43 8 3 8-3"/>',
    '<path fill="#E98E3D" d="M11 32 8 7l20 14h8L56 7l-3 25-8 21H21Z"/><path fill="#FFF6E5" d="m12 33 20 8 20-8-9 18H21Z"/><path fill="#1B1B2F" d="m28 40 4 6 5-6Z"/>',
    '<rect x="13" y="12" width="38" height="42" rx="12" fill="#354050"/><path fill="#FFF6E5" d="M19 30q0-14 13-6 13-8 13 6v17H19Z"/><path fill="#FFD23F" d="m27 36 5 9 6-9Z"/>',
    '<path fill="#F5A3B9" d="m13 25-4-13 18 6h10l18-6-4 13v24H13Z"/><rect x="23" y="35" width="20" height="14" rx="4" fill="#EE8EAA"/><path d="M29 41v3m8-3v3"/>',
    '<path fill="#929CAB" d="M12 49V9l19 15L52 9v40Z"/><path fill="#EE8EAA" d="m16 15 9 9h-9m24 0h8v-9"/><path d="M28 24v6m8-6v6M14 38h8m20 0h8"/><path fill="#FFF6E5" d="M24 41h16v9H24Z"/><path fill="#EE8EAA" d="m28 38 4 6 5-6Z"/>',
  ];
  return `<svg class="animal-icon" viewBox="0 0 64 64" role="img" aria-label="${ANIMALS[animal]}"><g stroke="${COLORS.ink}" stroke-width="2.5" stroke-linejoin="round">${parts[animal]}<path stroke-width="5" d="M22 30v3m20-3v3"/></g></svg>`;
}
export function heartIcons(hearts: number): string {
  return `<span class="heart-icons" role="img" aria-label="${hearts} hearts">${Array.from({ length: CONFIG.HEARTS_VERSUS }, (_, i) => `<svg viewBox="0 0 24 22" aria-hidden="true" class="${i < hearts ? 'full' : 'empty'}"><path d="M12 20 3 11C-4 2 7-3 12 4 17-3 28 2 21 11Z"/></svg>`).join('')}</span>`;
}
export function winPips(wins: number): string {
  return `<span class="win-pips" role="img" aria-label="${wins} round wins">${Array.from({ length: CONFIG.ROUNDS_TO_WIN }, (_, i) => `<i class="${i < wins ? 'won' : ''}"></i>`).join('')}</span>`;
}
