"""Bake the existing OFL Lilita One curves into tiny inline SVG paths. No raster assets."""
from pathlib import Path
import bpy

root = Path(__file__).resolve().parents[1]
font = bpy.data.fonts.load(str(root / 'art/fonts/LilitaOne-Regular.ttf'))
parts = []
for word, size, baseline, color in [('HOP', 100, 100, '#FFF6E5'), ('BRAWL', 140, 225, '#FFD23F')]:
    letters = []
    for index, letter in enumerate(word):
        curve = bpy.data.curves.new(letter, 'FONT')
        curve.body = letter
        curve.font = font
        obj = bpy.data.objects.new(letter, curve)
        bpy.context.collection.objects.link(obj)
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.convert(target='CURVE')
        data = []
        for spline in obj.data.splines:
            points = spline.bezier_points
            if not points:
                continue
            data.append(f'M{points[0].co.x:.3f},{-points[0].co.y:.3f}')
            for i in range(len(points)):
                a, b = points[i], points[(i + 1) % len(points)]
                data.append(f'C{a.handle_right.x:.3f},{-a.handle_right.y:.3f} {b.handle_left.x:.3f},{-b.handle_left.y:.3f} {b.co.x:.3f},{-b.co.y:.3f}')
            data.append('Z')
        letters.append((' '.join(data), obj.dimensions.x))
        bpy.data.objects.remove(obj, do_unlink=True)
    width = sum(width - .035 for _, width in letters) * size
    x = (520 - width) / 2
    for index, (path, width) in enumerate(letters):
        tilt = [-4, 4, -3, 5, -4][index]
        y = baseline + [-3, 3, -1, 2, -2][index]
        parts.append(f'<path transform="translate({x:.1f} {y}) rotate({tilt}) scale({size})" d="{path}" fill="{color}" stroke="#1B1B2F" stroke-width=".11" stroke-linejoin="round" paint-order="stroke fill"/>')
        x += (width - .035) * size
svg = '<svg class="load-wordmark" viewBox="0 0 520 255" role="img" aria-label="Hop Brawl">' + ''.join(parts) + '</svg>'
# The SVG is source markup inside index.html, not an external request.
html = root / 'client/index.html'
text = html.read_text(encoding='utf-8')
start, end = '<!-- WORDMARK -->', '<!-- /WORDMARK -->'
text = text[:text.index(start) + len(start)] + svg + text[text.index(end):]
html.write_text(text, encoding='utf-8')
print(f'Inline wordmark: {len(svg.encode())} bytes')
