from voxel_source import VoxelSource


def create():
    v = VoxelSource([10, 20, 10])
    bark, bark_light, dark, green, light = '#88583B', '#AA7750', '#3F854A', '#65AE52', '#87C663'
    v.box(4, 5, 0, 12, 4, 5, bark)
    v.box(4, 4, 1, 9, 6, 6, bark_light)
    v.box(2, 7, 7, 8, 4, 5, bark).box(2, 3, 8, 12, 4, 5, bark)
    v.box(6, 7, 9, 12, 4, 5, bark)
    v.box(2, 7, 9, 12, 2, 7, dark)
    v.box(0, 9, 11, 14, 3, 6, green)
    v.box(2, 7, 11, 15, 0, 9, green)
    v.box(1, 8, 12, 16, 1, 8, green)
    v.box(2, 7, 16, 18, 2, 7, light)
    v.box(3, 6, 19, 19, 3, 6, light)
    v.box(0, 2, 14, 15, 3, 5, light)
    v.box(6, 8, 15, 17, 3, 6, green)
    v.box(3, 5, 14, 16, 8, 9, light)
    return v
