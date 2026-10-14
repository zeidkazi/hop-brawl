from voxel_source import VoxelSource


def create():
    v = VoxelSource([8, 10, 10])
    orange, dark, white, ear, black = '#E88A35', '#9A4A29', '#FFF1D8', '#6D3836', '#20283A'
    for x in (1, 5):
        v.box(x, x + 1, 0, 1, 5, 7, dark)
    v.box(1, 6, 2, 5, 3, 6, orange).box(2, 5, 2, 4, 7, 7, white)
    v.box(1, 6, 5, 7, 4, 7, orange)
    v.box(0, 0, 5, 6, 5, 6, orange).box(7, 7, 5, 6, 5, 6, orange)
    for x in (1, 5):
        v.box(x, x + 1, 8, 8, 5, 6, orange)
        v.box(x, x, 9, 9, 5, 6, dark)
        v.box(x, x, 8, 8, 7, 7, ear)
    v.box(2, 5, 5, 6, 8, 8, white).box(3, 4, 5, 5, 9, 9, white)
    v.box(3, 4, 6, 6, 9, 9, black)
    for x in (1, 6):
        v.box(x, x, 7, 7, 7, 7, black, 'eyes')
    v.box(2, 4, 2, 3, 1, 2, orange, 'tail')
    v.box(1, 3, 3, 5, 0, 1, orange, 'tail')
    v.box(1, 3, 6, 7, 0, 1, white, 'tail')
    v.pivots['tail'] = [3.5, 3, 3]
    return v
