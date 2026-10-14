"""Blender-authored closed voxel arrows; animal names are now screen-space UI."""
import bpy
from build_models import mesh_parts, bake, preview
from voxel_source import VoxelSource


def build(root, config):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.world = bpy.data.worlds.new('PreviewWorld')
    v = VoxelSource([30, 18, 5])
    for x, radius in [(0, 0), (1, 1), (2, 2), (3, 3), (4, 3), (5, 1)]:
        v.box(x, x, 11-radius, 11+radius, 2, 3, '#FFF6E5', 'arrow')
    objects = mesh_parts('home_controls', v.data(), config)
    bpy.ops.object.select_all(action='DESELECT'); bake(objects, config)
    for obj in objects: obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(root / 'client/public/models/home_controls.glb'), export_format='GLB',
        use_selection=True, export_texcoords=False, export_extras=True, export_animations=False, export_all_vertex_colors=False,
        export_vertex_color='NAME', export_vertex_color_name='COLOR_0')
    for obj in objects:
        if obj.name.startswith('label_') and obj.name != 'label_chicken': obj.hide_render = True
    preview([o for o in objects if not o.hide_render], 'home_controls', config)
    bpy.ops.file.pack_all(); bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(root / 'art/home_controls.blend'), compress=True)
