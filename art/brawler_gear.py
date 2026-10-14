"""Closed voxel boxing gear; neutral AO colors allow one GLB per animal."""
from voxel_source import VoxelSource

ANIMALS = ('chicken', 'frog', 'fox', 'penguin', 'pig', 'cat')
# Authored anatomy: head left/right, forehead height, back/front depth.
HEADS = {'chicken': (2, 5, 9, 3, 6), 'frog': (1, 7, 6, 3, 7),
         'fox': (0, 6, 6, 4, 6), 'penguin': (1, 6, 9, 3, 6),
         'pig': (1, 7, 7, 4, 7), 'cat': (0, 6, 6, 4, 7)}


def equip(name, original, config=None):
    if name not in ANIMALS:
        return original
    config = config or {'GLOVE_VOXEL_SCALE': 2, 'GLOVE_HEAD_RATIO': 0.45}
    scale = config['GLOVE_VOXEL_SCALE']
    left, right, forehead, back, front = HEADS[name]
    class FineSource(VoxelSource):
        def data(self):
            return {**super().data(), 'voxel_scale': scale}
    v = FineSource([(original.size[0] + 12) * scale, original.size[1] * scale, (original.size[2] + 6) * scale])
    for (x, h, d), value in original.cells.items():
        # The new gloves take the place of wings/front paws, leaving rear feet.
        if name in ('chicken', 'penguin') and x in (0, 7) and 3 <= h <= 6 and 2 <= d <= 4:
            continue
        if name in ('fox', 'pig', 'cat') and h <= 1 and d >= 6:
            continue
        for xx in range(scale):
            for hh in range(scale):
                for dd in range(scale):
                    v.cells[(x + 6) * scale + xx, h * scale + hh, (d + 2) * scale + dd] = value
    for part, pivot in original.pivots.items():
        v.pivots[part] = [(pivot[0] + 6) * scale, pivot[1] * scale, (pivot[2] + 2) * scale]
    # A half-voxel authoring grid preserves the approved anatomy while allowing
    # real chamfers, cuffs and highlights even on the chicken's narrow head.
    width = max(4, round((right - left + 1) * scale * config['GLOVE_HEAD_RATIO']))
    left = (left + 6) * scale; right = (right + 7) * scale
    front = (front + 2) * scale
    chin = max(scale, (forehead - 4) * scale)
    for side, x in [('left', left - width - 1), ('right', right + 1)]:
        part = 'glove_' + side
        for xx in range(width):
            for hh in range(width):
                for dd in range(width):
                    # Cut every edge/corner by one small cube: rounded voxel fist.
                    if sum(t in (0, width - 1) for t in (xx, hh, dd)) >= 2: continue
                    color = '#DADADA'
                    if dd == width - 1 and 1 <= hh <= width - 2: color = '#EEEEEE'
                    if hh == width - 1 and dd >= width - 2: color = '#FFFFFF'
                    v.box(x + xx, x + xx, chin + hh, chin + hh, front + dd, front + dd, color, part)
        thumb = x + width if side == 'left' else x - 1
        v.box(thumb, thumb, chin + 1, chin + 2, front + 1, front + 2, '#BEBEBE', part)
        cuff = 'cuff_' + side
        v.box(x + 1, x + width - 2, chin, chin + width - 2, front - 2, front - 1, '#FFFFFF', cuff)
        pivot = [x + width / 2, chin + (width - 1) / 2, front - 2]
        v.pivots[part] = pivot; v.pivots[cuff] = pivot
        handle = part + '_handle'
        v.groups[handle] = [part, cuff]; v.group_pivots[handle] = pivot
    return v


def tint_preview(objects, color):
    from build_models import linear
    for obj in objects:
        if obj.get('part') not in ('glove_left', 'glove_right'):
            continue
        obj['player_color'] = True
        mat = obj.data.materials[0].copy()
        obj.data.materials[0] = mat
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        vertex = next(n for n in nodes if n.type == 'VERTEX_COLOR')
        mix = nodes.new('ShaderNodeMixRGB'); mix.blend_type = 'MULTIPLY'
        mix.inputs[0].default_value = 1; mix.inputs[2].default_value = (*linear(color), 1)
        links.new(vertex.outputs['Color'], mix.inputs[1])
        links.new(mix.outputs[0], nodes.get('Principled BSDF').inputs['Base Color'])
