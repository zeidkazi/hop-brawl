from voxel_source import VoxelSource


def create():
    v = VoxelSource([8, 11, 8])
    cream, wing, red, orange, eye = '#FFF8E7', '#E5DDC8', '#E74646', '#F5A623', '#20283A'
    for x in (2, 5):
        v.box(x, x + 1, 0, 0, 3, 6, orange)
        v.box(x, x, 1, 2, 4, 4, orange)
    v.box(1, 6, 2, 6, 1, 5, cream).box(2, 5, 3, 6, 6, 6, cream)
    v.box(0, 0, 3, 5, 2, 4, wing).box(7, 7, 3, 5, 2, 4, wing)
    v.box(2, 5, 5, 7, 0, 1, wing)
    v.box(2, 5, 6, 9, 3, 6, cream)
    v.box(3, 4, 10, 10, 3, 5, red).box(3, 4, 9, 9, 2, 2, red)
    v.box(3, 4, 7, 7, 7, 7, orange).box(3, 4, 6, 6, 6, 6, red)
    for x in (2, 5):
        v.box(x, x, 8, 8, 6, 6, eye, 'eyes')
    return v
