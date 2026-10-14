from voxel_source import VoxelSource
from recipes.chicken import create as chicken
import random

LETTERS = {
    'H': ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
    'O': ['11111', '10001', '10001', '10001', '10001', '10001', '11111'],
    'P': ['11111', '10001', '10001', '11111', '10000', '10000', '10000'],
    'B': ['11111', '10001', '10001', '11111', '10001', '10001', '11111'],
    'R': ['11111', '10001', '10001', '11111', '10000', '10000', '10000'],
    'A': ['11111', '10001', '10001', '11111', '10001', '10001', '10001'],
    'W': ['10001', '10001', '10001', '10101', '10101', '11111', '11011'],
    'L': ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
}


def create():
    v = VoxelSource([94, 66, 20])
    rng = random.Random(28)
    # Behind the punch: all rays are closed voxel volumes.
    for step in range(9):
        radius = 1 if step < 6 else 0
        for dx, dh in [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1), (1, -1), (-1, -1)]:
            if dx and dh and step > 5:
                continue
            x, h = 24 + dx * step, 14 + dh * step
            v.box(x - radius, x + radius, h - radius, h + radius, 1, 2, '#F59625', 'starburst')
    v.box(21, 27, 11, 17, 3, 3, '#FFD84D', 'starburst')
    v.pivots['starburst'] = [94 - 24, 14, 2]

    # Asphalt base and dashed white lane line.
    v.box(20, 90, 0, 1, 3, 17, '#343D4C', 'road_strip')
    v.box(20, 90, 2, 2, 3, 17, '#4A4E5A', 'road_strip')
    for x in range(24, 87, 12):
        v.box(x, x + 5, 2, 2, 14, 14, '#FFF6E5', 'road_strip')
    v.pivots['road_strip'] = [94 - 55, 0, 10]

    for text, left, bottom, color, offsets in [
        ('HOP', 38, 25, '#FFF6E5', [0, 4, 1]),
        ('BRAWL', 24, 4, '#FFD23F', [0, 1, 0, 1, 0]),
    ]:
        for index, letter in enumerate(text):
            part = f'{text}_{letter}'
            x0, h0 = left + index * 13, bottom + offsets[index]
            face = set()
            for row, line in enumerate(LETTERS[letter]):
                for col, bit in enumerate(line):
                    if bit == '1':
                        for dx in (0, 1):
                            for dh in (0, 1):
                                face.add((x0 + col * 2 + dx, h0 + (6 - row) * 2 + dh))
            outline = {(x + dx, h + dh) for x, h in face for dx in (-1, 0, 1) for dh in (-1, 0, 1)}
            for x, h in sorted(outline):
                v.box(x, x, h, h, 4, 7, '#1B1B2F', part)
            for x, h in sorted(face):
                v.box(x, x, h, h, 8, 9, color, part)
            pivot = [94 - (x0 + 5), h0, 7]
            tilt = rng.uniform(-4, 4)
            v.transforms[part] = {'center': pivot, 'tilt_deg': tilt}
            v.pivots[part] = pivot
            if letter == 'R':
                # One continuous sheared prism, not a stair-step voxel chain.
                leg = 'BRAWL_R_diagonal'
                v.box(x0 + 3, x0 + 6, h0, h0 + 5, 4, 7, '#1B1B2F', leg)
                v.box(x0 + 4, x0 + 5, h0, h0 + 5, 8, 9, color, leg)
                v.transforms[leg] = {'center': pivot, 'tilt_deg': tilt, 'shear_x': 2 / 3, 'shear_origin_h': h0 + 6}
                v.pivots[leg] = pivot
                v.groups['letter_R'] = [part, leg]
                v.group_pivots['letter_R'] = pivot

    # Reuse the approved chicken, pitched forward to look down toward BRAWL.
    for (x, h, d), (color, part) in chicken().cells.items():
        v.box(65 + x, 65 + x, 41 + h, 41 + h, 3 + d, 3 + d, color, 'chicken_eyes' if part == 'eyes' else 'chicken_body')
    perch = [94 - 69, 41, 7]
    for part in ('chicken_body', 'chicken_eyes'):
        v.transforms[part] = {'center': perch, 'tilt_deg': 0, 'pitch_deg': -16}
        v.pivots[part] = perch
    v.groups['chicken'] = ['chicken_body', 'chicken_eyes']
    v.group_pivots['chicken'] = perch

    for letter, x, h in [('H', 39, 22), ('O', 52, 25), ('P', 65, 23)]:
        part = f'dust_{letter}'
        v.box(x, x + 2, h, h + 1, 7, 9, '#E5DDC8', part)
        v.box(x + 4, x + 5, h + 1, h + 2, 8, 9, '#FFF6E5', part)
        v.box(x - 2, x - 2, h, h, 8, 8, '#FFF6E5', part)
        v.pivots[part] = [94 - (x + 2), h, 8]

    # Rounded voxel mitten, curled thumb and contrasting cuff band.
    v.box(10, 20, 9, 16, 8, 13, '#E53935', 'glove')
    v.box(12, 19, 17, 17, 9, 12, '#E53935', 'glove')
    v.box(21, 23, 10, 15, 9, 12, '#E53935', 'glove')
    v.box(16, 20, 7, 10, 12, 14, '#BF292D', 'glove')
    v.box(4, 9, 10, 14, 9, 12, '#95272A', 'glove')
    v.box(8, 9, 10, 14, 9, 12, '#FFF6E5', 'glove')
    v.pivots['glove'] = [94 - 7, 12, 11]
    # +Y is the front: mirrored X makes type read left to right.
    v.cells = {(93 - x, h, d): value for (x, h, d), value in v.cells.items()}
    return v
