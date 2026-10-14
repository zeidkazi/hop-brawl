from voxel_source import VoxelSource


def create():
    v = VoxelSource([36, 16, 11])
    red, dark, glass, steel = '#E64C56', '#283342', '#A7E4EE', '#AFBDC6'
    v.box(1, 34, 3, 4, 1, 9, dark)
    v.box(2, 12, 5, 14, 1, 9, red).box(1, 13, 15, 15, 1, 9, dark)
    for d in (1, 9):
        v.box(4, 10, 10, 13, d, d, glass).box(7, 7, 10, 13, d, d, red)
    v.box(12, 12, 10, 13, 2, 8, glass)
    v.box(13, 29, 5, 10, 2, 8, red).box(30, 33, 5, 8, 2, 8, red)
    v.box(34, 35, 5, 6, 2, 8, red)
    v.box(17, 19, 11, 13, 4, 6, dark)
    for x in range(15, 28, 3):
        v.box(x, x, 6, 9, 2, 2, dark).box(x, x, 6, 9, 8, 8, dark)
    v.box(35, 35, 6, 6, 4, 6, '#FFF4C2')
    for x in (4, 10, 23, 29):
        v.box(x, x + 2, 0, 2, 0, 2, dark).box(x, x + 2, 0, 2, 8, 10, dark)
        for d in (0, 10):
            v.box(x + 1, x + 1, 1, 1, d, d, steel)
    for x in (0, 35):
        v.box(x, x, 2, 3, 4, 6, steel)
    return v
