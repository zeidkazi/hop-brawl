"""Blender-authored voxel arrows, wooden sign and vector Lilita animal labels."""
import json
import bpy
from build_models import mesh_parts, bake, preview, linear
from voxel_source import VoxelSource


def build(root, config):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.world = bpy.data.worlds.new('PreviewWorld')
    v = VoxelSource([30, 18, 5])
    v.box(8, 21, 10, 16, 1, 3, '#99633E', 'sign')
    v.box(9, 20, 11, 15, 4, 4, '#CC944C', 'sign')
    v.box(14, 15, 0, 9, 2, 3, '#70452B', 'sign')
    for x, radius in [(0, 0), (1, 1), (2, 2), (3, 3), (4, 3), (5, 1)]:
        v.box(x, x, 11-radius, 11+radius, 2, 3, '#FFF6E5', 'arrow')
    objects = mesh_parts('home_controls', v.data(), config)
    font = bpy.data.fonts.load(str(root / 'art/fonts/LilitaOne-Regular.ttf'))
    for name in ('chicken', 'frog', 'fox', 'penguin', 'pig', 'cat'):
        curve = bpy.data.curves.new(name, 'FONT'); curve.body = name.upper(); curve.font = font
        curve.size = 0.24; curve.extrude = 0.006; curve.resolution_u = 2
        curve.align_x = 'CENTER'; curve.align_y = 'CENTER'
        obj = bpy.data.objects.new('label_' + name, curve); bpy.context.collection.objects.link(obj)
        obj.rotation_euler.x = 1.5707963267948966
        obj.location = (0, 0.23, 1.09)
        bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active = obj
        bpy.ops.object.convert(target='MESH'); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        base = obj.data.color_attributes.new(name='BaseColor', type='FLOAT_COLOR', domain='CORNER')
        for c in base.data: c.color = (*linear('#FFF6E5'), 1)
        ao = obj.data.color_attributes.new(name='BakedAO', type='FLOAT_COLOR', domain='CORNER')
        obj.data.color_attributes.active_color = ao
        objects.append(obj)
    bpy.ops.object.select_all(action='DESELECT'); bake(objects, config)
    for obj in objects: obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(root / 'client/public/models/home_controls.glb'), export_format='GLB',
        use_selection=True, export_texcoords=False, export_extras=True, export_animations=False,
        export_vertex_color='NAME', export_vertex_color_name='COLOR_0')
    for obj in objects:
        if obj.name.startswith('label_') and obj.name != 'label_chicken': obj.hide_render = True
    preview([o for o in objects if not o.hide_render], 'home_controls', config)
    bpy.ops.file.pack_all(); bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(root / 'art/home_controls.blend'), compress=True)
