from voxel_source import VoxelSource


def create():
    v = VoxelSource([36, 16, 11])
    blue, glass, dark, steel = '#4E9BD8', '#B6E6EF', '#283342', '#AFBDC6'
    v.box(1, 34, 3, 4, 1, 9, dark)
    v.box(1, 34, 5, 13, 1, 9, blue)
    v.box(1, 34, 14, 14, 1, 9, '#326D9E').box(2, 33, 15, 15, 2, 8, '#326D9E')
    for d in (1, 9):
        v.box(1, 34, 6, 6, d, d, '#FFF4C2')
        for x in (3, 9, 23, 29):
            v.box(x, x + 3, 8, 12, d, d, glass)
        v.box(16, 19, 5, 12, d, d, steel)
        v.box(17, 18, 9, 11, d, d, glass)
        v.box(18, 18, 7, 7, d, d, dark)
    for x in (1, 34):
        v.box(x, x, 8, 12, 3, 7, glass)
    for x in (4, 10, 23, 29):
        v.box(x, x + 2, 0, 2, 0, 2, dark).box(x, x + 2, 0, 2, 8, 10, dark)
        for d in (0, 10):
            v.box(x + 1, x + 1, 1, 1, d, d, steel)
    for x in (0, 35):
        v.box(x, x, 2, 3, 4, 6, steel)
    return v
