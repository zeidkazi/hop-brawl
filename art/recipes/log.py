from voxel_source import VoxelSource


def create():
    v = VoxelSource([12, 5, 10])
    bark, groove, wood, ring = '#97623C', '#68442D', '#DCB676', '#A97A46'
    v.box(0, 11, 0, 4, 2, 7, bark).box(0, 11, 1, 3, 1, 8, bark)
    for d in (3, 6):
        v.box(1, 10, 4, 4, d, d, groove)
    for x in (3, 7):
        v.box(x, x, 2, 2, 1, 1, groove).box(x, x, 2, 2, 8, 8, groove)
    # Both ends have nested stepped growth rings, without textures.
    for x in (0, 11):
        v.box(x, x, 1, 3, 2, 7, wood)
        v.box(x, x, 1, 3, 3, 6, ring)
        v.box(x, x, 2, 2, 4, 5, wood)
    return v
