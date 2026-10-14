from voxel_source import VoxelSource

# Original block-letter voxel stencils, not a font or raster texture.
LETTERS = {
    'H': ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
    'O': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    'P': ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
    'B': ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
    'R': ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    'A': ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    'W': ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
    'L': ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
}


def create():
    v = VoxelSource([60, 34, 6])
    for text, bottom, color in [('HOP', 19, '#FFF6E5'), ('BRAWL', 1, '#FFD23F')]:
        width = len(text) * 12 - 2
        left = (60 - width) // 2
        face = set()
        for letter_index, letter in enumerate(text):
            for row, line in enumerate(LETTERS[letter]):
                for col, bit in enumerate(line):
                    if bit == '1':
                        for dx in (0, 1):
                            for dh in (0, 1):
                                face.add((left + letter_index * 12 + col * 2 + dx, bottom + (6 - row) * 2 + dh))
        outline = {(x + dx, h + dh) for x, h in face for dx in (-1, 0, 1) for dh in (-1, 0, 1)}
        for x, h in sorted(outline):
            v.box(x, x, h, h, 0, 3, '#1B1B2F')
        for x, h in sorted(face):
            v.box(x, x, h, h, 4, 5, color)
    # Front is +Y in Blender, so readable type runs toward decreasing world X.
    v.cells = {(59 - x, h, d): value for (x, h, d), value in v.cells.items()}
    return v
