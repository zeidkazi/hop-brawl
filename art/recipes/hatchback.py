from voxel_source import VoxelSource


def create():
    v = VoxelSource([12, 9, 10])
    blue, glass, rubber = '#4E9BD8', '#B6E6EF', '#263242'
    v.box(1, 10, 2, 2, 1, 8, '#3274AF').box(0, 11, 3, 3, 1, 8, blue)
    # Taller rear hatch profile, same low roof height as the sedan.
    v.box(1, 7, 4, 5, 1, 8, glass).box(1, 7, 6, 6, 1, 8, blue)
    for x in (1, 7):
        for d in (1, 8):
            v.box(x, x, 4, 5, d, d, blue)
    for d in (1, 8):
        v.box(4, 4, 4, 5, d, d, blue)
    for x in (2, 8):
        v.box(x, x + 1, 0, 1, 0, 1, rubber).box(x, x + 1, 0, 1, 8, 9, rubber)
    for x in (0, 11):
        v.box(x, x, 2, 2, 2, 7, '#D0D9DC')
        for d in (2, 6):
            v.box(x, x, 3, 3, d, d + 1, '#FFF4C2' if x == 11 else '#EE5860')
    return v
