"""Small authoring helpers. Mesh creation/export is exclusively in Blender."""
class VoxelSource:
    def __init__(self, size):
        self.size = size
        self.cells = {}
        self.pivots = {}

    def box(self, x0, x1, h0, h1, d0, d1, color, part='body'):
        for x in range(x0, x1 + 1):
            for h in range(h0, h1 + 1):
                for d in range(d0, d1 + 1):
                    assert 0 <= x < self.size[0] and 0 <= h < self.size[1] and 0 <= d < self.size[2], (x, h, d, self.size)
                    self.cells[x, h, d] = (color, part)
        return self

    def remove(self, x0, x1, h0, h1, d0, d1):
        for x in range(x0, x1 + 1):
            for h in range(h0, h1 + 1):
                for d in range(d0, d1 + 1):
                    self.cells.pop((x, h, d), None)
        return self

    def data(self):
        palette, voxels, parts = [], [], {}
        for (x, h, d), (color, part) in sorted(self.cells.items()):
            if color not in palette:
                palette.append(color)
            if part != 'body':
                parts.setdefault(part, []).append(len(voxels))
            voxels.append([x, h, d, palette.index(color)])
        return {'size': self.size, 'palette': palette, 'voxels': voxels, 'parts': parts, 'pivots': self.pivots}
