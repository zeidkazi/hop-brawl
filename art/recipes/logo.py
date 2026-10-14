from voxel_source import VoxelSource

# Original connected block-letter stencils. Each cell becomes a 2x2 stroke.
LETTERS = {
    'H': ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
    'O': ['11111', '10001', '10001', '10001', '10001', '10001', '11111'],
    'P': ['11111', '10001', '10001', '11111', '10000', '10000', '10000'],
    'B': ['11111', '10001', '10001', '11111', '10001', '10001', '11111'],
    'R': ['11111', '10001', '10001', '11111', '10110', '10011', '10001'],
    'A': ['11111', '10001', '10001', '11111', '10001', '10001', '10001'],
    'W': ['10001', '10001', '10001', '10101', '10101', '11111', '11011'],
    'L': ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
}


def create():
    v = VoxelSource([68, 40, 6])
    # Fixed irregular offsets/tilts keep playful lettering reproducible.
    for text, bottom, color, tilts, offsets in [
        ('HOP', 23, '#FFF6E5', [-3, 2, -2], [0, 1, 0]),
        ('BRAWL', 3, '#FFD23F', [2, -3, 1, -2, 3], [1, 0, 1, 0, 1]),
    ]:
        width = len(text) * 13 - 3
        left = (68 - width) // 2
        for index, letter in enumerate(text):
            part = f'{text}_{index}_{letter}'
            face = set()
            origin_x, origin_h = left + index * 13, bottom + offsets[index]
            for row, line in enumerate(LETTERS[letter]):
                for col, bit in enumerate(line):
                    if bit == '1':
                        for dx in (0, 1):
                            for dh in (0, 1):
                                face.add((origin_x + col * 2 + dx, origin_h + (6 - row) * 2 + dh))
            outline = {(x + dx, h + dh) for x, h in face for dx in (-1, 0, 1) for dh in (-1, 0, 1)}
            for x, h in sorted(outline):
                v.box(x, x, h, h, 0, 3, '#1B1B2F', part)
            for x, h in sorted(face):
                v.box(x, x, h, h, 4, 5, color, part)
            v.transforms[part] = {'center': [68 - (origin_x + 5), origin_h + 7, 3], 'tilt_deg': tilts[index]}
    # Front is +Y: type runs toward decreasing world X.
    v.cells = {(67 - x, h, d): value for (x, h, d), value in v.cells.items()}
    return v
