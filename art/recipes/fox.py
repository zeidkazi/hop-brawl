from voxel_source import VoxelSource


def create():
    v = VoxelSource([8, 10, 10])
    orange, brown, white, black = '#EB8531', '#643C2B', '#FFF1D8', '#20283A'
    # Small body and four short dark paws beneath the oversized head.
    for x in (1, 5):
        for d in (3, 6):
            v.box(x, x + 1, 0, 0, d, d + 1, brown)
            v.box(x, x + 1, 1, 1, d, d + 1, orange)
    v.box(2, 5, 2, 3, 3, 6, orange).box(3, 4, 2, 3, 7, 7, white)
    v.box(0, 6, 3, 6, 4, 6, orange)
    # Triangular stepped ears are solid connected cubes, including their tips.
    for start in (0, 4):
        v.box(start, start + 2, 7, 7, 4, 5, orange)
    v.box(0, 1, 8, 8, 4, 5, orange).box(5, 6, 8, 8, 4, 5, orange)
    v.box(0, 0, 9, 9, 4, 5, brown).box(6, 6, 9, 9, 4, 5, brown)
    v.box(0, 1, 3, 4, 6, 7, white).box(5, 6, 3, 4, 6, 7, white)
    v.box(2, 4, 3, 4, 7, 7, white).box(3, 3, 3, 4, 8, 9, white)
    v.box(3, 3, 4, 4, 9, 9, black)
    v.face(1, 5, 6, 6)
    # Sweep the bushy tail out to the camera-facing side, beyond the head.
    v.box(4, 5, 2, 3, 1, 2, orange, 'tail')
    # Broad orange haunch and a large cream cap remain legible from the 52-degree play camera.
    v.box(4, 7, 3, 5, 0, 3, orange, 'tail')
    v.box(5, 7, 6, 7, 0, 3, white, 'tail')
    v.box(5, 6, 8, 8, 1, 2, white, 'tail')
    v.pivots['tail'] = [4.5, 3, 3]
    return v
