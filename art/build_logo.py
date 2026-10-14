"""Lilita One Text geometry, with smooth and actual Blender BLOCKS-remesh exports."""
import json
import math
import random

import bpy
import bmesh
from mathutils import Vector
from build_models import linear, mesh_parts, bake, point_at
from compact_glb import compact


def bounds(obj):
    return [min(v.co[i] for v in obj.data.vertices) for i in range(3)], [max(v.co[i] for v in obj.data.vertices) for i in range(3)]


def text_mesh(font, char, height, backing, config, sources):
    curve = bpy.data.curves.new(f'Lilita_{char}', 'FONT')
    curve.body, curve.font = char, font
    curve.size = 1
    curve.resolution_u = config['LOGO_CURVE_RESOLUTION']
    curve.extrude = config['LOGO_TEXT_EXTRUDE']
    curve.bevel_depth = config['LOGO_TEXT_BEVEL']
    curve.bevel_resolution = 1
    obj = bpy.data.objects.new('Text_' + char, curve)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.update()
    # Font size sets cap height; depth/bevel retain their requested scene units.
    curve.size *= height / (obj.dimensions.y - 2 * curve.bevel_depth)
    if backing:
        curve.offset = height * config['LOGO_OUTLINE_RATIO']
        curve.extrude += config['LOGO_TEXT_EXTRUDE'] / 2
    source = obj.copy()
    source.data = curve.copy()
    sources.objects.link(source)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    if backing:
        # A backing plate is solid behind counters. Expanding tiny inner font
        # contours can invert them; keep the outer contour before meshing.
        bpy.ops.object.convert(target='CURVE')
        def area(spline):
            pts = [p.co for p in spline.bezier_points]
            return abs(sum(a.x * b.y - b.x * a.y for a, b in zip(pts, pts[1:] + pts[:1])))
        outer = max(obj.data.splines, key=area)
        for spline in list(obj.data.splines):
            if spline != outer: obj.data.splines.remove(spline)
    bpy.ops.object.convert(target='MESH')
    return obj, source


def simplify(obj):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=0.00001)
    bmesh.ops.dissolve_limit(bm, angle_limit=0.001, verts=list(bm.verts), edges=list(bm.edges))
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def colors(obj, backing, line, config):
    mesh = obj.data
    base = mesh.color_attributes.new(name='BaseColor', type='FLOAT_COLOR', domain='CORNER')
    ao = mesh.color_attributes.new(name='BakedAO', type='FLOAT_COLOR', domain='CORNER')
    mesh.color_attributes.active_color = ao
    lo, hi = bounds(obj)
    for face in mesh.polygons:
        # Before orientation, text faces +Z. Up is +Y.
        color = config['LOGO_INK'] if backing else config['LOGO_CREAM'] if line == 'HOP' else config['LOGO_YELLOW']
        if not backing and line == 'BRAWL' and face.normal.z < 0.5:
            color = config['LOGO_HIGHLIGHT'] if face.normal.y > 0.1 else config['LOGO_SIDE']
        if not backing and face.normal.y > 0.1 and face.normal.z > 0:
            color = '#FFFFFF' if line == 'HOP' else config['LOGO_HIGHLIGHT']
        for idx in face.loop_indices:
            v = mesh.vertices[mesh.loops[idx].vertex_index].co
            highlight = not backing and face.normal.z > 0.5 and v.y > hi[1] - (hi[1] - lo[1]) * config['LOGO_HIGHLIGHT_RATIO']
            base.data[idx].color = (*linear(('#FFFFFF' if line == 'HOP' else config['LOGO_HIGHLIGHT']) if highlight else color), 1)


def render(root, objects, name, config):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = config['PREVIEW_SAMPLES']
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = config['LOGO_REVIEW_WIDTH'], config['LOGO_REVIEW_HEIGHT']
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.view_settings.view_transform = 'Standard'
    scene.world.use_nodes = True
    nodes = scene.world.node_tree.nodes
    bg = nodes.get('Background')
    bg.inputs['Color'].default_value = (1, 1, 1, 1)
    bg.inputs['Strength'].default_value = config['PREVIEW_WORLD_STRENGTH']
    sky = nodes.new('ShaderNodeBackground')
    sky.inputs['Color'].default_value = (*linear(config['LOGO_SKY']), 1)
    lightpath = nodes.new('ShaderNodeLightPath')
    mix = nodes.new('ShaderNodeMixShader')
    links = scene.world.node_tree.links
    links.new(lightpath.outputs['Is Camera Ray'], mix.inputs[0])
    links.new(bg.outputs[0], mix.inputs[1]); links.new(sky.outputs[0], mix.inputs[2])
    links.new(mix.outputs[0], nodes.get('World Output').inputs['Surface'])
    bpy.context.view_layer.update()
    pts = [obj.matrix_world @ v.co for obj in objects for v in obj.data.vertices]
    center = Vector(tuple((min(p[i] for p in pts) + max(p[i] for p in pts)) / 2 for i in range(3)))
    side = math.radians(config['LOGO_CAMERA_SIDE_DEG']); up = math.radians(config['LOGO_CAMERA_UP_DEG'])
    bpy.ops.object.camera_add(location=center + Vector((math.tan(side), -1, math.tan(up))) * 15)
    cam = bpy.context.object
    cam.data.type = 'ORTHO'; point_at(cam, center); scene.camera = cam
    bpy.context.view_layer.update()
    pts = [cam.matrix_world.inverted() @ p for p in pts]
    aspect = config['LOGO_REVIEW_WIDTH'] / config['LOGO_REVIEW_HEIGHT']
    cam.data.ortho_scale = max(max(p.x for p in pts)-min(p.x for p in pts), (max(p.y for p in pts)-min(p.y for p in pts))*aspect) * config['PREVIEW_MARGIN']
    for pos, energy in [((-3, -5, 7), config['KEY_ENERGY']), ((4, -4, 3), config['FILL_ENERGY']), ((0, 4, 6), config['RIM_ENERGY'])]:
        bpy.ops.object.light_add(type='AREA', location=center + Vector(pos))
        light = bpy.context.object
        light.data.energy = energy; light.data.size = config['KEY_SIZE']; point_at(light, center)
    scene.render.filepath = str(root / 'art/previews' / f'{name}.png')
    bpy.ops.render.render(write_still=True)


def build_variant(root, config, blocks):
    name = 'logo_blocks' if blocks else 'logo_smooth'
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.world = bpy.data.worlds.new('LogoSky')
    font = bpy.data.fonts.load(str(root / 'art/fonts/LilitaOne-Regular.ttf'))
    sources = bpy.data.collections.new('Editable Lilita One Text sources')
    bpy.context.scene.collection.children.link(sources)
    sources.hide_render = True; sources.hide_viewport = True
    rng = random.Random(config['LOGO_LAYOUT_SEED'])
    objects, handles, records = [], [], []
    perch = None
    for line, ratio, baseline in [('BRAWL', 1, 0), ('HOP', config['LOGO_HOP_RATIO'], config['LOGO_TEXT_HEIGHT'] + config['LOGO_LINE_GAP'])]:
        height = config['LOGO_TEXT_HEIGHT'] * ratio
        letters, cursor = [], 0
        for char in line:
            face, editable = text_mesh(font, char, height, False, config, sources)
            lo, hi = bounds(face)
            width = hi[0] - lo[0]
            tilt = rng.choice([-1, 1]) * rng.uniform(config['LOGO_TILT_MIN_DEG'], config['LOGO_TILT_MAX_DEG'])
            nudge = rng.uniform(-1, 1) * config['LOGO_NUDGE_RATIO'] * height
            letters.append((char, face, editable, cursor + width / 2, (lo[0]+hi[0])/2, lo[1], tilt, nudge))
            cursor += width - config['LOGO_LETTER_OVERLAP']
        for char, face, editable, x, cx, bottom, tilt, nudge in letters:
            handle = bpy.data.objects.new(f'logo_{line}_{char}', None)
            bpy.context.collection.objects.link(handle)
            handle.location = (x - (cursor + config['LOGO_LETTER_OVERLAP']) / 2, 0, baseline + nudge)
            handle.rotation_euler.y = math.radians(tilt)
            handles.append(handle)
            backing, backing_source = text_mesh(font, char, height, True, config, sources)
            for obj, source, is_back in [(face, editable, False), (backing, backing_source, True)]:
                if blocks:
                    bpy.context.view_layer.objects.active = obj
                    remesh = obj.modifiers.new('Text to closed voxel blocks', 'REMESH')
                    remesh.mode = 'BLOCKS'; remesh.octree_depth = config['LOGO_REMESH_DEPTH']
                    remesh.scale = config['LOGO_REMESH_SCALE']; remesh.use_remove_disconnected = False
                    bpy.ops.object.modifier_apply(modifier=remesh.name)
                simplify(obj)
                colors(obj, is_back, line, config)
                depth = config['LOGO_TEXT_EXTRUDE'] * 2 if is_back else 0
                for v in obj.data.vertices:
                    px, py, pz = v.co
                    v.co = (px - cx, -pz + depth, py - bottom)
                obj.data.update()
                obj.name = handle.name + ('_outline' if is_back else '_face')
                obj.parent = handle
                source.name = obj.name + '_TextSource'
                obj['text_font'] = 'Lilita One'; obj['variant'] = 'blocks' if blocks else 'smooth'
                obj['extrude'] = config['LOGO_TEXT_EXTRUDE']; obj['bevel'] = config['LOGO_TEXT_BEVEL']
                if blocks: obj['remesh_depth'] = config['LOGO_REMESH_DEPTH']
                objects.append(obj)
            records.append({'node': handle.name, 'tilt_deg': tilt, 'height_nudge': nudge, 'height': height})
            if line == 'HOP' and char == 'O':
                bpy.context.view_layer.update()
                top = max((face.matrix_world @ v.co).z for v in face.data.vertices)
                perch = (handle.location.x, 0, top)
    source = json.loads((root / 'art/voxels/chicken.json').read_text())
    chicken_parts = mesh_parts('logo_chicken', source, config)
    chicken = bpy.data.objects.new('logo_chicken', None)
    bpy.context.collection.objects.link(chicken)
    chicken.location = perch
    chicken.rotation_euler.z = math.pi
    chicken.scale = (config['LOGO_CHICKEN_SCALE'],) * 3
    for obj in chicken_parts:
        obj.parent = chicken
    handles.append(chicken); objects += chicken_parts
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    bake(objects, config)
    # Byte colors and quantized AO avoid float noise splitting every shared vertex.
    for obj in objects:
        old = obj.data.color_attributes['COLOR_0']
        rgba = [tuple(c.color) for c in old.data]
        obj.data.color_attributes.remove(old)
        output = obj.data.color_attributes.new(name='COLOR_0', type='BYTE_COLOR', domain='CORNER')
        for c, value in zip(output.data, rgba): c.color = value
        obj.data.color_attributes.active_color = output
        obj.data.color_attributes.render_color_index = list(obj.data.color_attributes).index(output)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects + handles: obj.select_set(True)
    folder = root / 'art/variants'; folder.mkdir(exist_ok=True)
    output = folder / f'{name}.glb'
    bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', use_selection=True,
        export_yup=True, export_texcoords=False, export_normals=True, export_materials='EXPORT',
        export_animations=False, export_extras=True, export_apply=True,
        export_all_vertex_colors=False, export_vertex_color='NAME', export_vertex_color_name='COLOR_0')
    compact(output)
    print(f'LOGO_SIZE {name}: {output.stat().st_size}', flush=True)
    render(root, objects, name, config)
    bpy.ops.file.pack_all()
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(root / 'art' / f'{name}.blend'), compress=True)
    (folder / f'{name}.json').write_text(json.dumps({'font': 'Lilita One', 'variant': name, 'letters': records, 'bytes': output.stat().st_size, 'remesh_depth': config['LOGO_REMESH_DEPTH'] if blocks else None}, indent=2)+'\n')
    if output.stat().st_size >= config['LOGO_GLB_BUDGET']:
        raise ValueError(f'{name} exceeds the logo byte budget')


def build_variants(root, config):
    for blocks in (False, True):
        build_variant(root, config, blocks)
    # Assemble the two native Blender renders without changing their colors.
    import numpy as np
    frames = []
    for name in ('logo_smooth', 'logo_blocks'):
        img = bpy.data.images.load(str(root / 'art/previews' / f'{name}.png'), check_existing=False)
        values = np.empty(len(img.pixels), dtype=np.float32)
        img.pixels.foreach_get(values)
        frames.append(values.reshape(config['LOGO_REVIEW_HEIGHT'], config['LOGO_REVIEW_WIDTH'], 4))
    pixels = np.concatenate(frames, axis=1)
    rgb = pixels[:, :, :3]
    pixels[:, :, :3] = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    strip = bpy.data.images.new('A smooth - B blocks', width=config['LOGO_REVIEW_WIDTH'] * 2,
        height=config['LOGO_REVIEW_HEIGHT'], alpha=True, float_buffer=True)
    strip.pixels.foreach_set(pixels.ravel())
    strip.save_render(str(root / 'art/previews/logo-comparison.png'), scene=bpy.context.scene)
