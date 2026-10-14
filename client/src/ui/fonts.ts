import titleUrl from '@fontsource/pixelify-sans/files/pixelify-sans-latin-700-normal.woff2?url';
import bodyUrl from '@fontsource/nunito/files/nunito-latin-700-normal.woff2?url';
import boldUrl from '@fontsource/nunito/files/nunito-latin-800-normal.woff2?url';

export async function preloadFonts(): Promise<void> {
  const fonts = [[titleUrl, 'Pixelify Sans', '700'], [bodyUrl, 'Nunito', '700'], [boldUrl, 'Nunito', '800']] as const;
  await Promise.all(fonts.map(async ([url, family, weight]) => {
    const link = document.createElement('link');
    link.rel = 'preload'; link.as = 'font'; link.type = 'font/woff2'; link.crossOrigin = 'anonymous'; link.href = url;
    document.head.append(link);
    const face = new FontFace(family, `url("${url}")`, { weight, style: 'normal', display: 'block' });
    document.fonts.add(await face.load());
  }));
  await document.fonts.ready;
}
