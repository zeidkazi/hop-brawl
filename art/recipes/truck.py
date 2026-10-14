from voxel_source import VoxelSource


def create():
    v = VoxelSource([24, 13, 11])
    orange, glass, rubber, steel = '#ED963F', '#A7E4EE', '#263242', '#9CAEBB'
    v.box(1, 22, 3, 3, 1, 9, steel)
    v.box(1, 14, 4, 12, 1, 9, '#DDE5E7')
    v.box(1, 14, 4, 4, 1, 9, '#AEBFC8')
    for x in (1, 7):
        v.box(x, x, 5, 11, 1, 1, '#B8C8CF').box(x, x, 5, 11, 9, 9, '#B8C8CF')
    v.box(16, 22, 4, 5, 1, 9, orange)
    v.box(16, 21, 6, 8, 1, 9, glass).box(16, 21, 9, 9, 1, 9, orange)
    # Solid painted rear cab wall; no glass-colored sheet behind the driver.
    v.box(16, 16, 6, 8, 1, 9, orange)
    for x in (16, 21):
        for d in (1, 9):
            v.box(x, x, 6, 8, d, d, orange)
    v.box(22, 23, 4, 4, 1, 9, orange)
    v.box(23, 23, 3, 3, 2, 8, steel).box(23, 23, 4, 4, 4, 6, rubber)
    for d in (2, 7):
        v.box(23, 23, 4, 4, d, d + 1, '#FFF4C2')
    for x in (3, 10, 18):
        v.box(x, x + 2, 0, 2, 0, 1, rubber).box(x, x + 2, 0, 2, 9, 10, rubber)
        for d in (0, 10):
            v.box(x + 1, x + 1, 1, 1, d, d, steel)
    return v
