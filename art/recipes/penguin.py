from voxel_source import VoxelSource


def create():
    v = VoxelSource([8, 11, 8])
    dark, white, wing, orange, black = '#2C3F50', '#FFF8E7', '#20303E', '#F5A623', '#101820'
    for x in (1, 5):
        v.box(x, x + 1, 0, 0, 4, 7, orange)
    v.box(1, 6, 1, 6, 1, 5, dark).box(2, 5, 7, 10, 2, 5, dark)
    v.box(1, 6, 7, 9, 3, 5, dark)
    v.box(2, 5, 2, 6, 6, 6, white).box(2, 5, 7, 9, 6, 6, white)
    v.box(3, 4, 6, 6, 6, 6, dark)
    v.box(0, 0, 3, 6, 2, 4, wing).box(7, 7, 3, 6, 2, 4, wing)
    v.box(3, 4, 7, 7, 7, 7, orange)
    v.box(2, 5, 1, 2, 0, 0, dark)
    for x in (2, 5):
        v.box(x, x, 8, 8, 6, 6, black, 'eyes')
    return v
