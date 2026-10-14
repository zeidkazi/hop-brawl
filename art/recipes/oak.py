from voxel_source import VoxelSource


def create():
    v = VoxelSource([14, 20, 14])
    bark, bark_light, dark, green, light = '#88583B', '#AA7750', '#3F854A', '#65AE52', '#87C663'
    # Four-voxel trunk: twice the original two-voxel width and depth.
    v.box(5, 8, 0, 12, 5, 8, bark)
    v.box(5, 5, 1, 8, 8, 8, bark_light)
    v.box(4, 9, 0, 1, 5, 8, bark).box(5, 8, 0, 1, 4, 9, bark)
    v.box(2, 11, 6, 8, 5, 8, bark)
    v.box(2, 4, 8, 11, 5, 8, bark).box(9, 11, 8, 11, 5, 8, bark)
    # Broad interlocking blocks and low spreading tiers, not a ball on a stick.
    v.box(1, 12, 8, 11, 2, 11, dark)
    v.box(0, 13, 10, 13, 3, 10, green)
    v.box(2, 11, 10, 14, 0, 13, green)
    v.box(1, 12, 13, 16, 2, 11, green)
    v.box(3, 10, 16, 18, 3, 10, light)
    v.box(4, 9, 19, 19, 4, 9, light)
    v.box(0, 3, 13, 14, 4, 8, light)
    v.box(9, 13, 14, 16, 4, 8, green)
    v.box(4, 7, 14, 16, 10, 13, light)
    return v
