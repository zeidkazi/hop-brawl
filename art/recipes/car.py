from voxel_source import VoxelSource


def create():
    v = VoxelSource([12, 9, 10])
    red, trim, glass, rubber, light, tail = '#EE5860', '#C63D4A', '#82CBDD', '#263242', '#FFF4C2', '#FFAD42'
    v.box(1, 10, 2, 2, 1, 8, trim).box(0, 11, 3, 3, 1, 8, red)
    # One flush cabin: roof footprint exactly matches all four window walls.
    v.box(3, 8, 4, 5, 1, 8, glass).box(3, 8, 6, 6, 1, 8, red)
    for x in (3, 8):
        for d in (1, 8):
            v.box(x, x, 4, 5, d, d, red)
    for d in (1, 8):
        v.box(5, 5, 4, 5, d, d, red)
    v.box(8, 8, 4, 5, 2, 7, '#A7E4EE')  # front windshield
    # Smaller 2x2 wheels, inset under the body.
    for x in (2, 8):
        for d in (0, 9):
            v.box(x, x + 1, 0, 1, d if d == 0 else 8, 1 if d == 0 else d, rubber)
    v.box(0, 0, 2, 2, 2, 7, '#D0D9DC').box(11, 11, 2, 2, 2, 7, '#D0D9DC')
    for d in (2, 6):
        v.box(11, 11, 3, 3, d, d + 1, light)
        v.box(0, 0, 3, 3, d, d + 1, tail)
    v.box(11, 11, 2, 2, 4, 5, rubber)
    return v
