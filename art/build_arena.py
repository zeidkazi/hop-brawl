"""Closed voxel event furniture, spectators and biome decorations, authored in Blender."""
import bpy
from build_models import mesh_parts, bake, preview
from voxel_source import VoxelSource


def recipes():
    ink, yellow, white, coral = '#1B1B2F', '#FFD23F', '#FFF6E5', '#FF6B6B'
    result = {}
    for name, snowy in [('bleacher', False), ('snow_bleacher', True)]:
        v = VoxelSource([30, 12, 18])
        for tier in range(3):
            d, h = tier * 6, (2 - tier) * 4
            v.box(0, 29, h, h + 1, d, d + 5, '#F1F7FF' if snowy else '#60718C')
            for x in (1, 27): v.box(x, x + 1, 0, h, d, d + 1, ink)
            v.box(0, 29, h + 2, h + 2, d + 1, d + 2, '#C4E5F8' if snowy else coral)
        result[name] = v
    v = VoxelSource([10, 12, 7])
    v.box(3, 6, 2, 6, 2, 5, '#FFFFFF').box(2, 7, 7, 11, 2, 6, '#D7A97D')
    for x, side in [(0, 'left'), (8, 'right')]: v.box(x, x + 1, 3, 7, 2, 4, '#FFFFFF', 'arm_' + side)
    for x in (3, 6): v.box(x, x, 0, 1, 3, 4, ink)
    for x in (3, 6): v.box(x, x, 9, 9, 6, 6, ink)
    result['spectator'] = v
    v = VoxelSource([6, 10, 6]); v.box(0, 5, 0, 0, 0, 5, ink)
    v.box(1, 4, 1, 4, 1, 4, '#FF7A32').box(2, 3, 5, 9, 2, 3, '#FF7A32')
    v.box(1, 4, 3, 3, 1, 4, white); result['cone'] = v
    v = VoxelSource([24, 11, 5])
    for x in (2, 20): v.box(x, x + 1, 0, 9, 1, 3, ink)
    v.box(0, 23, 6, 10, 1, 3, yellow)
    for x in range(0, 24, 6): v.box(x, x + 2, 6, 10, 4, 4, ink)
    result['barrier'] = v
    v = VoxelSource([36, 18, 3])
    for x in (0, 35): v.box(x, x, 0, 17, 1, 1, ink)
    v.box(0, 35, 16, 16, 1, 1, white)
    for i, color in enumerate([coral, yellow, '#4D96FF', '#C77DFF', '#6BCB77']):
        x = 3 + i * 6
        for row in range(4): v.box(x + row // 2, x + 4 - row // 2, 15 - row, 15 - row, 1, 1, color)
    result['bunting'] = v
    v = VoxelSource([14, 40, 10])
    v.box(2, 11, 0, 1, 1, 8, ink)
    for x in (4, 9): v.box(x, x, 2, 33, 4, 5, '#60718C')
    for h in range(4, 34, 5): v.box(4, 9, h, h, 4, 5, ink)
    v.box(0, 13, 33, 39, 3, 6, ink)
    for x in (1, 6, 11): v.box(x, x + 1, 35, 37, 7, 7, white, 'lamps')
    result['spotlight'] = v
    v = VoxelSource([5, 5, 5]); v.box(2, 2, 0, 4, 2, 2, '#247E3B')
    v.box(0, 0, 0, 2, 2, 2, '#3CA348').box(4, 4, 0, 2, 2, 2, '#3CA348'); result['tuft'] = v
    v = VoxelSource([5, 5, 5]); v.box(2, 2, 0, 3, 2, 2, '#247E3B')
    v.box(1, 3, 4, 4, 1, 3, coral).box(2, 2, 4, 4, 2, 2, yellow); result['flower'] = v
    v = VoxelSource([3, 1, 9]); v.box(0, 2, 0, 0, 2, 6, white).box(1, 1, 0, 0, 0, 8, white); result['foam'] = v
    v = VoxelSource([12, 8, 8]); v.box(0, 11, 0, 7, 0, 7, '#DC9B2E')
    for x in (2, 8): v.box(x, x, 0, 7, 0, 7, '#8A5122'); result['hay'] = v
    v = VoxelSource([8, 8, 8]); v.box(1, 6, 0, 5, 1, 6, '#EE7927').box(2, 5, 6, 6, 2, 5, '#EE7927')
    v.box(3, 4, 7, 7, 3, 4, '#3A6934'); result['pumpkin'] = v
    v = VoxelSource([7, 4, 7]); v.box(0, 6, 2, 3, 0, 6, coral)
    v.remove(1, 5, 2, 3, 1, 5); v.box(5, 6, 0, 1, 6, 6, coral); result['scarf'] = v
    v = VoxelSource([20, 12, 4]); v.box(0, 19, 0, 11, 0, 2, ink)
    v.box(1, 18, 1, 1, 3, 3, '#2EC4D6').box(1, 18, 10, 10, 3, 3, '#2EC4D6')
    for x in (1, 18): v.box(x, x, 1, 10, 3, 3, '#2EC4D6')
    v.box(5, 14, 4, 7, 3, 3, '#FF6BBD'); result['neon_sign'] = v
    return result


def build(root, config):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.world = bpy.data.worlds.new('ArenaPreview')
    objects = []
    for name, source in recipes().items():
        parts = mesh_parts('arena_' + name, source.data(), config)
        # Merge static pieces into one node per instanced prop.
        for obj in parts: obj['arena_kind'] = name
        objects += parts
    names = list(recipes())
    for obj in objects:
        i = names.index(obj['arena_kind']); obj.location.x += (i % 4) * 4; obj.location.y -= (i // 4) * 5
    bpy.context.view_layer.update()
    bake(objects, config)
    for obj in objects: obj.location = (0, 0, 0)
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(root / 'client/public/models/arena.glb'), export_format='GLB',
        use_selection=True, export_texcoords=False, export_extras=True, export_animations=False,
        export_all_vertex_colors=False, export_vertex_color='NAME', export_vertex_color_name='COLOR_0')
    # Arrange the contact preview only after exporting the bottom-center assets.
    for obj in objects:
        i = names.index(obj['arena_kind']); obj.location.x += (i % 4) * 3.5; obj.location.y -= (i // 4) * 4
    bpy.context.view_layer.update()
    preview(objects, 'arena', {**config, 'PREVIEW_SIZE': 1400})
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(root / 'art/arena.blend'), compress=True)
