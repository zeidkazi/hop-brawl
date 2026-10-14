from voxel_source import VoxelSource


def create():
    v = VoxelSource([9, 7, 9])
    green, light, dark = '#69C957', '#C5E77A', '#419C46'
    # Broad, low haunches and splayed toes distinguish the frog in silhouette.
    for x in (0, 6):
        v.box(x, x + 2, 1, 2, 1, 4, dark)
        v.box(x, x + 2, 0, 0, 4, 7, green)
        for toe in (x, x + 2):
            v.box(toe, toe, 0, 0, 8, 8, green)
    v.box(2, 6, 1, 2, 3, 6, green).box(3, 5, 1, 2, 7, 7, light)
    v.box(1, 7, 3, 4, 3, 7, green)
    # Raised eye lobes, but the same one-cube eyes/height as the chicken.
    for x in (1, 5):
        v.box(x, x + 2, 5, 6, 4, 7, green)
    v.face(2, 6, 6, 7)
    v.box(2, 6, 3, 3, 7, 7, light)
    v.box(3, 5, 3, 3, 7, 7, '#2C7136')
    for x in (2, 6):
        v.box(x, x, 4, 4, 7, 7, '#2C7136')
    return v
