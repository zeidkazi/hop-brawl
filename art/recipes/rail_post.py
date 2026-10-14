from voxel_source import VoxelSource


def create():
    v = VoxelSource([8, 20, 5])
    ink, white, steel, red = '#1B1B2F', '#FFF6E5', '#87949C', '#EE4266'
    v.box(2, 5, 0, 1, 1, 3, ink)
    v.box(3, 4, 2, 13, 2, 3, steel)
    for h in (3, 7, 11):
        v.box(3, 4, h, h + 1, 2, 3, white)
    v.box(0, 7, 13, 17, 1, 3, ink)
    v.box(0, 7, 18, 19, 2, 2, ink)
    v.box(1, 2, 14, 16, 4, 4, red, 'lamp_left')
    v.box(5, 6, 14, 16, 4, 4, red, 'lamp_right')
    for x in range(8):
        v.box(x, x, 18 + (x % 2), 18 + (x % 2), 2, 2, white)
    return v
