import titleUrl from '@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2?url';
import bodyUrl from '@fontsource/nunito/files/nunito-latin-700-normal.woff2?url';
import boldUrl from '@fontsource/nunito/files/nunito-latin-800-normal.woff2?url';
import { downloads, registerAsset } from './downloads';

const fonts = [[titleUrl, 'Lilita One', '400', 'lilita-one-latin-400-normal.woff2'],
  [bodyUrl, 'Nunito', '700', 'nunito-latin-700-normal.woff2'],
  [boldUrl, 'Nunito', '800', 'nunito-latin-800-normal.woff2']] as const;
for (const [url, , , filename] of fonts) registerAsset(url, filename);
let loaded = false;

export async function preloadFonts(): Promise<void> {
  if (loaded) return;
  await downloads.load();
  await Promise.all(fonts.map(async ([url, family, weight]) => {
    const face = new FontFace(family, downloads.bytes(url), { weight, style: 'normal', display: 'block' });
    try { document.fonts.add(await face.load()); }
    catch (error) { downloads.invalidate(url); throw error; }
  }));
  await document.fonts.ready;
  loaded = true;
}
