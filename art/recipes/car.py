from voxel_source import VoxelSource


def create():
    v = VoxelSource([12, 9, 10])
    red, trim, glass, rubber, light, tail = '#EE5860', '#C63D4A', '#82CBDD', '#263242', '#FFF4C2', '#FFAD42'
    v.box(1, 10, 2, 3, 1, 8, trim).box(0, 11, 4, 5, 1, 8, red)
    v.box(3, 8, 6, 7, 2, 7, glass).box(4, 7, 8, 8, 2, 7, red)
    for d in (1, 8):
        v.box(3, 8, 6, 7, d, d, glass)
        for x in (3, 6, 8):
            v.box(x, x, 6, 7, d, d, red)
        for x in (2, 9):
            v.box(x - 1, x + 1, 0, 2, 0 if d == 1 else 9, 0 if d == 1 else 9, rubber)
            v.box(x, x, 1, 1, 0 if d == 1 else 9, 0 if d == 1 else 9, '#A9B6BE')
    v.box(0, 0, 3, 3, 2, 7, '#D0D9DC').box(11, 11, 3, 3, 2, 7, '#D0D9DC')
    for d in (2, 6):
        v.box(11, 11, 4, 4, d, d + 1, light)
        v.box(0, 0, 4, 4, d, d + 1, tail)
    v.box(11, 11, 3, 3, 4, 5, rubber)
    return v
