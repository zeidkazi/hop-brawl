"""Closed voxel boxing gear; neutral AO colors allow one GLB per animal."""
from voxel_source import VoxelSource

ANIMALS = ('chicken', 'frog', 'fox', 'penguin', 'pig', 'cat')
# Authored anatomy: head left/right, forehead height, back/front depth.
HEADS = {'chicken': (2, 5, 9, 3, 6), 'frog': (1, 7, 6, 3, 7),
         'fox': (0, 6, 6, 4, 6), 'penguin': (1, 6, 9, 3, 6),
         'pig': (1, 7, 7, 4, 7), 'cat': (0, 6, 6, 4, 7)}


def equip(name, original):
    if name not in ANIMALS:
        return original
    left, right, forehead, back, front = HEADS[name]
    v = VoxelSource([original.size[0] + 6, original.size[1] + 1, original.size[2] + 4])
    for (x, h, d), value in original.cells.items():
        # The new gloves take the place of wings/front paws, leaving rear feet.
        if name in ('chicken', 'penguin') and x in (0, 7) and 3 <= h <= 6 and 2 <= d <= 4:
            continue
        if name in ('fox', 'pig', 'cat') and h <= 1 and d >= 6:
            continue
        v.cells[x + 3, h, d + 1] = value
    for part, pivot in original.pivots.items():
        v.pivots[part] = [pivot[0] + 3, pivot[1], pivot[2] + 1]
    left += 3; right += 3; back += 1; front += 1
    for side, x in [('left', left - 2), ('right', right)]:
        part = 'glove_' + side
        v.box(x, x + 2, 2, 4, front, front + 2, '#FFFFFF', part)
        # Thumb bulge and a wrist cuff make a glove rather than a cube hand.
        thumb = x + 3 if side == 'left' else x - 1
        v.box(thumb, thumb, 2, 3, front, front + 1, '#FFFFFF', part)
        v.box(x, x + 2, 2, 3, front - 1, front - 1, '#DADDE5', part)
        v.pivots[part] = [x + 1.5, 3, front - 0.5]
    # White wrap with a color stripe across the forehead, clear of the eyes.
    v.box(left, right, forehead, forehead, front + 1, front + 1, '#FFFFFF', 'headband')
    v.box(left - 1, left - 1, forehead, forehead, back, front, '#FFFFFF', 'headband')
    v.box(right + 1, right + 1, forehead, forehead, back, front, '#FFFFFF', 'headband')
    v.box(left, right, forehead, forehead, back - 1, back - 1, '#FFFFFF', 'headband')
    v.box(left + 1, right - 1, forehead, forehead, front + 1, front + 1, '#FFFFFF', 'headband_stripe')
    v.box(right, right + 1, forehead - 1, forehead, back - 2, back - 2, '#FFFFFF', 'headband_stripe')
    return v


def tint_preview(objects, color):
    from build_models import linear
    for obj in objects:
        if obj.get('part') not in ('glove_left', 'glove_right', 'headband_stripe'):
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
