from voxel_source import VoxelSource


def create():
    v = VoxelSource([8, 10, 9])
    grey, stripe, cream, pink, eye = '#9BAAB1', '#596D7B', '#E4E9E3', '#DD8F9E', '#203142'
    for x in (1, 5):
        v.box(x, x + 1, 0, 1, 5, 7, cream)
    v.box(1, 6, 2, 5, 3, 6, grey).box(2, 5, 2, 4, 7, 7, cream)
    v.box(1, 6, 5, 7, 4, 7, grey)
    for x in (1, 5):
        v.box(x, x + 1, 8, 8, 4, 6, grey).box(x, x, 9, 9, 4, 6, stripe)
        v.box(x, x, 8, 8, 7, 7, pink)
    for x in (2, 5):
        v.box(x, x, 7, 7, 6, 7, stripe)
        v.box(x, x, 6, 6, 7, 7, eye, 'eyes')
    v.box(2, 5, 5, 5, 8, 8, cream).box(3, 4, 6, 6, 8, 8, pink)
    for h in (3, 5):
        v.box(1, 1, h, h, 3, 5, stripe).box(6, 6, h, h, 3, 5, stripe)
    v.box(0, 1, 3, 3, 1, 3, grey, 'tail').box(0, 0, 4, 7, 0, 1, grey, 'tail')
    v.box(0, 0, 5, 5, 0, 1, stripe, 'tail').box(0, 1, 8, 8, 0, 1, stripe, 'tail')
    v.pivots['tail'] = [1, 3.5, 3]
    return v
