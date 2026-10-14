from voxel_source import VoxelSource


def create():
    v = VoxelSource([8, 10, 9])
    grey, stripe, white, pink = '#9BAAB1', '#596D7B', '#F2F0E7', '#E791A4'
    for x in (1, 4):
        for d in (2, 6):
            v.box(x, x + 1, 0, 0, d, d + 1, white)
            v.box(x, x + 1, 1, 1, d, d + 1, grey)
    v.box(1, 5, 2, 3, 2, 6, grey)
    v.box(2, 4, 2, 3, 7, 7, white)
    v.box(0, 6, 3, 6, 4, 7, grey)
    for start in (0, 4):
        v.box(start, start + 2, 7, 7, 4, 6, grey)
        v.box(start + 1, start + 1, 7, 7, 6, 6, pink)
    v.box(0, 1, 8, 8, 4, 6, grey).box(5, 6, 8, 8, 4, 6, grey)
    v.box(0, 0, 9, 9, 4, 6, grey).box(6, 6, 9, 9, 4, 6, grey)
    # Forehead and back stripes are voxel colors, never loose planes.
    for x in (1, 3, 5):
        v.box(x, x, 6, 6, 5, 7, stripe)
    for d in (2, 3):
        v.box(1, 5, 3, 3, d, d, stripe)
        v.box(1, 1, 2, 3, d, d, stripe).box(5, 5, 2, 3, d, d, stripe)
    v.box(2, 4, 3, 3, 8, 8, white)
    v.box(2, 2, 4, 4, 8, 8, white).box(4, 4, 4, 4, 8, 8, white)
    v.box(3, 3, 4, 4, 8, 8, pink)
    v.face(1, 5, 6, 7)
    # Slender tail curves upward behind the right shoulder with a hooked tip.
    v.box(5, 6, 2, 2, 1, 2, grey, 'tail')
    v.box(6, 7, 3, 3, 1, 1, grey, 'tail')
    v.box(7, 7, 4, 7, 1, 1, grey, 'tail')
    v.box(6, 7, 8, 8, 1, 1, grey, 'tail')
    v.box(6, 6, 7, 7, 1, 1, stripe, 'tail')
    v.box(7, 7, 5, 5, 1, 1, stripe, 'tail')
    v.pivots['tail'] = [5.5, 2.5, 2]
    return v
