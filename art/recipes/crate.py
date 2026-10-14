from voxel_source import VoxelSource


def create():
    v = VoxelSource([10, 10, 10])
    wood, edge, seam, gold, nail = '#C28B51', '#E3AF67', '#805431', '#FFD23F', '#65554A'
    v.box(0, 9, 0, 9, 0, 9, wood)
    for h in (0, 9):
        v.box(0, 9, h, h, 0, 9, edge)
    for x in (0, 9):
        for d in (0, 9):
            v.box(x, x, 0, 9, d, d, edge)
    for p in (2, 5, 8):
        v.box(p, p, 1, 8, 0, 0, seam).box(p, p, 1, 8, 9, 9, seam)
        v.box(0, 0, 1, 8, p, p, seam).box(9, 9, 1, 8, p, p, seam)
        v.box(p, p, 9, 9, 1, 8, seam)
    mark = ['111', '001', '011', '000', '010']
    for side in range(4):
        # Dark inset panel gives the yellow question mark a readable silhouette.
        for u in range(2, 7):
            for h in range(1, 8):
                x, d = (9 - u, 9) if side == 0 else (u, 0) if side == 1 else (0, 9 - u) if side == 2 else (9, u)
                v.box(x, x, h, h, d, d, seam)
        for row, line in enumerate(mark):
            for col, bit in enumerate(line):
                if bit == '0':
                    continue
                u, h = col + 3, 6 - row
                x, d = (9 - u, 9) if side == 0 else (u, 0) if side == 1 else (0, 9 - u) if side == 2 else (9, u)
                v.box(x, x, h, h, d, d, gold)
    for h in (1, 8):
        for x in (1, 8):
            for d in (0, 9):
                v.box(x, x, h, h, d, d, nail)
    return v
