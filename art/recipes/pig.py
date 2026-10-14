from voxel_source import VoxelSource


def create():
    v = VoxelSource([9, 9, 10])
    pink, snout, ear, hoof, black = '#F1A5AF', '#DE7F92', '#E58B9E', '#9B526B', '#29283C'
    for x in (1, 6):
        for d in (2, 6):
            v.box(x, x + 1, 0, 1, d, d + 1, hoof)
            v.box(x, x + 1, 2, 2, d, d + 1, pink)
    v.box(1, 7, 2, 5, 1, 7, pink).box(0, 8, 3, 4, 2, 6, pink)
    v.box(1, 7, 5, 6, 4, 7, pink)
    v.box(1, 2, 7, 8, 5, 6, ear).box(6, 7, 7, 8, 5, 6, ear)
    v.box(2, 6, 3, 5, 8, 9, snout)
    for x in (3, 5):
        v.box(x, x, 4, 4, 9, 9, hoof)
    for x in (1, 7):
        v.box(x, x, 6, 6, 7, 7, black, 'eyes')
    v.box(3, 3, 4, 6, 0, 0, ear, 'tail').box(4, 5, 6, 6, 0, 0, ear, 'tail')
    v.box(5, 5, 5, 5, 0, 0, ear, 'tail')
    v.pivots['tail'] = [3.5, 4.5, 1]
    return v
