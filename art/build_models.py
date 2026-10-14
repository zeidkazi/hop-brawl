"""Headless Blender-only voxel -> Cycles AO -> GLB + editable blend + PNG."""
import argparse
import importlib.util
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'art'))
# Blender coordinates: x = width, y = forward/depth, z = height.
FACES = (
    ((1, 0, 0), ((1, 0, 0), (1, 1, 0), (1, 1, 1), (1, 0, 1))),
    ((-1, 0, 0), ((0, 1, 0), (0, 0, 0), (0, 0, 1), (0, 1, 1))),
    ((0, 1, 0), ((1, 1, 0), (0, 1, 0), (0, 1, 1), (1, 1, 1))),
    ((0, -1, 0), ((0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1))),
    ((0, 0, 1), ((0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1))),
    ((0, 0, -1), ((0, 1, 0), (1, 1, 0), (1, 0, 0), (0, 0, 0))),
)


def linear(hex_color):
    rgb = [int(hex_color.lstrip('#')[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in rgb)


def mesh_parts(name, source, config):
    size = source['size']
    voxels = source['voxels']
    if len(size) != 3 or any(not isinstance(n, int) or n <= 0 for n in size):
        raise ValueError('Invalid voxel dimensions')
    occupied = {}
    for i, voxel in enumerate(voxels):
        x, h, d, color = voxel
        if not (0 <= x < size[0] and 0 <= h < size[1] and 0 <= d < size[2] and 0 <= color < len(source['palette'])):
            raise ValueError(f'{name}: voxel {i} outside declared bounds/palette')
        if (x, d, h) in occupied:
            raise ValueError(f'{name}: duplicate voxel')
        occupied[x, d, h] = color
    assignments = {}
    for part, indices in source.get('parts', {}).items():
        for index in indices:
            if index in assignments or not 0 <= index < len(voxels):
                raise ValueError('Invalid part assignment')
            assignments[index] = part
    groups = {}
    for i, (x, h, d, color) in enumerate(voxels):
        groups.setdefault(assignments.get(i, 'body'), []).append((x, d, h, color))
    palette = [linear(color) for color in source['palette']]
    unit = 1 / config['VOXELS_PER_TILE']
    objects = []
    for part, cells in groups.items():
        vertices, faces, colors = [], [], []
        for x, d, h, color in cells:
            for normal, corners in FACES:
                if (x + normal[0], d + normal[1], h + normal[2]) in occupied:
                    continue
                face = []
                for cx, cy, cz in corners:
                    face.append(len(vertices))
                    vertices.append(((x + cx - size[0] / 2) * unit, (d + cy - size[2] / 2) * unit, (h + cz) * unit))
                    colors.append((*palette[color], 1))
                faces.append(face)
        mesh = bpy.data.meshes.new(f'{name}_{part}')
        mesh.from_pydata(vertices, [], faces)
        mesh.update()
        obj = bpy.data.objects.new(f'{name}_{part}', mesh)
        bpy.context.collection.objects.link(obj)
        # The body origin is bottom-center; tails pivot at their attachment.
        if part in source.get('pivots', {}):
            x, h, d = source['pivots'][part]
            pivot = Vector(((x - size[0] / 2) * unit, (d - size[2] / 2) * unit, h * unit))
            for vertex in mesh.vertices:
                vertex.co -= pivot
            obj.location = pivot
        base = mesh.color_attributes.new(name='BaseColor', type='FLOAT_COLOR', domain='CORNER')
        ao = mesh.color_attributes.new(name='BakedAO', type='FLOAT_COLOR', domain='CORNER')
        for loop in mesh.loops:
            base.data[loop.index].color = colors[loop.vertex_index]
        mesh.color_attributes.active_color = ao
        obj['part'] = part
        objects.append(obj)
    return objects


def material():
    mat = bpy.data.materials.new('HopBrawl_VertexColor')
    mat.use_nodes = True
    mat.use_backface_culling = True
    nodes = mat.node_tree.nodes
    shader = nodes.get('Principled BSDF')
    shader.inputs['Roughness'].default_value = 1
    shader.inputs['Metallic'].default_value = 0
    color = nodes.new('ShaderNodeVertexColor')
    color.layer_name = 'COLOR_0'
    mat.node_tree.links.new(color.outputs['Color'], shader.inputs['Base Color'])
    return mat


def bake(objects, config):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = config['BAKE_SAMPLES']
    scene.render.bake.target = 'VERTEX_COLORS'
    scene.render.bake.use_selected_to_active = False
    scene.world.color = (1, 1, 1)
    shared = material()
    for obj in objects:
        obj.data.materials.append(shared)
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.bake(type='AO')
    for obj in objects:
        mesh = obj.data
        base = mesh.color_attributes['BaseColor']
        ao = mesh.color_attributes['BakedAO']
        output = mesh.color_attributes.new(name='COLOR_0', type='FLOAT_COLOR', domain='CORNER')
        for i in range(len(output.data)):
            shade = max(config['AO_FLOOR'], min(1, sum(ao.data[i].color[:3]) / 3))
            shade = 1 - config['AO_STRENGTH'] * (1 - shade)
            output.data[i].color = (*(v * shade for v in base.data[i].color[:3]), 1)
        mesh.color_attributes.active_color = output
        mesh.color_attributes.render_color_index = list(mesh.color_attributes).index(output)
        obj['ao_samples'] = config['BAKE_SAMPLES']
        obj['ao_min'] = min(c.color[0] for c in ao.data)
        obj['ao_max'] = max(c.color[0] for c in ao.data)


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def preview(objects, name, config):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = config['PREVIEW_SAMPLES']
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.resolution_x = config['LOGO_PREVIEW_WIDTH'] if name == 'logo' else config['PREVIEW_SIZE']
    scene.render.resolution_y = config['LOGO_PREVIEW_HEIGHT'] if name == 'logo' else config['PREVIEW_SIZE']
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'Standard'
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get('Background')
    background.inputs['Color'].default_value = (0.8, 0.9, 1, 1)
    background.inputs['Strength'].default_value = config['PREVIEW_WORLD_STRENGTH']
    points = [obj.matrix_world @ v.co for obj in objects for v in obj.data.vertices]
    lower = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    upper = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    center = (lower + upper) / 2
    scale = max(upper - lower)
    bpy.ops.object.camera_add(location=center + Vector((0.85, 1.5, 0.95)) * scale)
    camera = bpy.context.object
    camera.name = 'PreviewCamera'
    camera.data.type = 'ORTHO'
    camera.data.lens = config['PREVIEW_FOCAL_LENGTH']
    point_at(camera, center)
    scene.camera = camera
    bpy.context.view_layer.update()
    view = camera.matrix_world.inverted()
    projected = [view @ p for p in points]
    width = max(p.x for p in projected) - min(p.x for p in projected)
    height = max(p.y for p in projected) - min(p.y for p in projected)
    aspect = scene.render.resolution_x / scene.render.resolution_y
    camera.data.ortho_scale = max(height, width / aspect) * config['PREVIEW_MARGIN']
    # Blender ortho_scale is horizontal for landscape output.
    if aspect > 1:
        camera.data.ortho_scale *= aspect
    for light_name, position, energy in (
        ('Key', (-3, 4, 6), config['KEY_ENERGY']),
        ('Fill', (4, 1, 3), config['FILL_ENERGY']),
        ('Rim', (-1, -4, 4), config['RIM_ENERGY']),
    ):
        bpy.ops.object.light_add(type='AREA', location=center + Vector(position) * max(1, scale / 2))
        light = bpy.context.object
        light.name = light_name
        light.data.energy = energy * max(1, scale / 2) ** 2
        light.data.shape = 'DISK'
        light.data.size = config['KEY_SIZE'] * max(1, scale / 2)
        point_at(light, center)
    scene.render.filepath = str(ROOT / 'art' / 'previews' / f'{name}.png')
    bpy.ops.render.render(write_still=True)


def build(name, config, author=False):
    if not name.replace('_', '').isalnum():
        raise ValueError('Invalid asset name')
    source_path = ROOT / 'art' / 'voxels' / f'{name}.json'
    if author:
        recipe_path = ROOT / 'art' / 'recipes' / f'{name}.py'
        spec = importlib.util.spec_from_file_location(name, recipe_path)
        recipe = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(recipe)
        source_path.write_text(json.dumps(recipe.create().data(), separators=(',', ':')) + '\n', encoding='utf-8')
    source = json.loads(source_path.read_text(encoding='utf-8'))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.world = bpy.data.worlds.new('PreviewWorld')
    objects = mesh_parts(name, source, config)
    bake(objects, config)
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    output = ROOT / 'client' / 'public' / 'models' / f'{name}.glb'
    bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', use_selection=True,
        export_yup=True, export_texcoords=False, export_normals=True, export_materials='EXPORT',
        export_animations=False, export_extras=True, export_apply=True,
        export_all_vertex_colors=False, export_vertex_color='NAME', export_vertex_color_name='COLOR_0')
    preview(objects, name, config)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'art' / f'{name}.blend'), compress=True)
    triangles = sum(len(p.vertices) - 2 for obj in objects for p in obj.data.polygons)
    print(f'ASSET_OK {name}: {len(source["voxels"])} voxels, {triangles} triangles, {output.stat().st_size} bytes', flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', required=True)
    parser.add_argument('--model')
    parser.add_argument('--author', action='store_true')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    config = json.loads(Path(args.config).read_text(encoding='utf-8'))
    for path in ('art/voxels', 'art/previews', 'client/public/models'):
        (ROOT / path).mkdir(parents=True, exist_ok=True)
    if args.self_test:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.context.scene.world = bpy.data.worlds.new('TestWorld')
        objects = mesh_parts('fixture', {'size': [2, 1, 1], 'palette': ['#FFFFFF'], 'voxels': [[0, 0, 0, 0], [1, 0, 0, 0]]}, config)
        assert len(objects[0].data.polygons) == 10, 'Interior faces must be removed'
        bake(objects, config)
        assert all(math.isfinite(v) for c in objects[0].data.color_attributes['COLOR_0'].data for v in c.color)
        print('BLENDER_SELF_TEST_OK', flush=True)
        return
    names = [args.model] if args.model else [p.stem for p in sorted((ROOT / 'art' / 'voxels').glob('*.json'))]
    if not names:
        parser.error('No voxel sources found; select an authored recipe with --model NAME --author')
    for name in names:
        build(name, config, args.author)
    total = sum(p.stat().st_size for p in (ROOT / 'client' / 'public' / 'models').glob('*.glb'))
    if total >= config['TOTAL_GLB_BUDGET']:
        raise ValueError(f'GLB asset budget exceeded: {total}')


if __name__ == '__main__':
    main()
