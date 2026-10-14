from voxel_source import VoxelSource


def create():
    v = VoxelSource([9, 9, 10])
    pink, snout, ear, hoof = '#F1A5AF', '#DE7F92', '#E58B9E', '#9B526B'
    for x in (2, 5):
        for d in (2, 6):
            v.box(x, x + 1, 0, 0, d, d + 1, hoof)
            v.box(x, x + 1, 1, 1, d, d + 1, pink)
    v.box(2, 6, 2, 4, 2, 6, pink)
    v.box(1, 7, 4, 7, 4, 7, pink)
    # Broad roots taper downward/forward into floppy triangular ear tips.
    v.box(0, 2, 8, 8, 5, 6, pink).box(6, 8, 8, 8, 5, 6, pink)
    v.box(0, 1, 7, 7, 6, 7, ear).box(7, 8, 7, 7, 6, 7, ear)
    v.box(0, 0, 6, 6, 7, 8, ear).box(8, 8, 6, 6, 7, 8, ear)
    v.box(2, 6, 4, 5, 8, 9, snout)
    for x in (3, 5):
        v.box(x, x, 4, 4, 9, 9, hoof)
    v.face(2, 6, 7, 7)
    # A small closed-cube curl, exposed on the right rear silhouette.
    v.box(6, 7, 3, 3, 1, 2, ear, 'tail')
    v.box(7, 7, 4, 5, 1, 1, ear, 'tail')
    v.box(6, 6, 5, 5, 1, 1, ear, 'tail')
    v.pivots['tail'] = [6.5, 3.5, 2]
    return v
