from voxel_source import VoxelSource


def create():
    v = VoxelSource([9, 7, 9])
    green, light, dark, white, black = '#69C957', '#C5E77A', '#419C46', '#FFF8E7', '#20283A'
    for x in (0, 6):
        v.box(x, x + 2, 0, 0, 5, 8, green)
    v.box(1, 7, 1, 3, 1, 6, green).box(2, 6, 4, 4, 2, 6, green)
    v.box(0, 1, 1, 2, 1, 4, dark).box(7, 8, 1, 2, 1, 4, dark)
    v.box(2, 6, 1, 2, 7, 7, light)
    v.box(2, 6, 3, 3, 7, 7, green).box(3, 5, 2, 2, 7, 7, dark)
    for x in (1, 6):
        v.box(x, x + 1, 4, 6, 5, 6, green)
        v.box(x, x + 1, 5, 6, 7, 7, white)
        v.box(x + 1, x + 1, 5, 5, 7, 7, black, 'eyes')
    v.box(2, 3, 4, 4, 2, 2, dark).box(5, 6, 4, 4, 3, 3, dark)
    return v
