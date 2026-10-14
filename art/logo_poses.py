"""Render four intro staging poses from the exported logo's editable rig."""
import math

import bpy
import numpy as np


def render_review(root, config):
    bpy.ops.wm.open_mainfile(filepath=str(root / 'art' / 'logo.blend'))
    scene = bpy.context.scene
    models = [obj for obj in scene.objects if obj.type in {'MESH', 'EMPTY'}]
    original = {obj.name: (obj.location.copy(), obj.rotation_euler.copy(), obj.scale.copy()) for obj in models}
    hop = [bpy.data.objects[f'logo_HOP_{letter}'] for letter in 'HOP']
    brawl = [bpy.data.objects[name] for name in ('logo_BRAWL_B', 'logo_letter_R', 'logo_BRAWL_A', 'logo_BRAWL_W', 'logo_BRAWL_L')]
    chicken = bpy.data.objects['logo_chicken']
    glove = bpy.data.objects['logo_glove']
    burst = bpy.data.objects['logo_starburst']
    unit = 1 / config['VOXELS_PER_TILE']
    scene.render.resolution_x = config['LOGO_POSE_WIDTH']
    scene.render.resolution_y = config['LOGO_POSE_HEIGHT']
    frames = []

    def hide(obj):
        if obj.type == 'MESH':
            obj.hide_render = True
        for child in obj.children:
            hide(child)

    for index in range(4):
        for obj in models:
            obj.location, obj.rotation_euler, obj.scale = original[obj.name]
            obj.hide_render = False
        if index == 0:
            for letter, lift in zip(hop, config['LOGO_POSE_HOP_LIFTS']):
                letter.location.z += lift * unit
            for obj in [*brawl, chicken, glove, burst]:
                hide(obj)
            hide(bpy.data.objects['logo_dust_O'])
            hide(bpy.data.objects['logo_dust_P'])
        elif index == 1:
            for letter, lift in zip(brawl, config['LOGO_POSE_BRAWL_LIFTS']):
                letter.location.z += lift * unit
            chicken.location.z += config['LOGO_POSE_CHICKEN_LIFT'] * unit
            hide(glove)
            hide(burst)
        elif index == 2:
            glove.location.x += config['LOGO_POSE_GLOVE_PULLBACK'] * unit
            hide(burst)
        else:
            burst.scale *= config['LOGO_POSE_HIT_SCALE']
            for i, letter in enumerate(brawl):
                letter.rotation_euler.y = math.radians(config['LOGO_POSE_SHAKE_DEG']) * (-1 if i % 2 else 1)
        bpy.context.view_layer.update()
        path = root / 'tmp' / f'logo-intro-{index + 1}.png'
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        frame = bpy.data.images.load(str(path), check_existing=False)
        values = np.empty(len(frame.pixels), dtype=np.float32)
        frame.pixels.foreach_get(values)
        frames.append(values.reshape(config['LOGO_POSE_HEIGHT'], config['LOGO_POSE_WIDTH'], 4))
        bpy.data.images.remove(frame)
    # Assemble the native Blender render buffers; no raster edits or new artwork.
    pixels = np.concatenate(frames, axis=1)
    expected = pixels.copy()
    # PNG pixel reads are sRGB; save_render expects linear scene RGB.
    rgb = pixels[:, :, :3]
    pixels[:, :, :3] = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    strip = bpy.data.images.new('LogoIntroReview', width=config['LOGO_POSE_WIDTH'] * 4,
        height=config['LOGO_POSE_HEIGHT'], alpha=True, float_buffer=True)
    strip.pixels.foreach_set(pixels.ravel())
    strip.file_format = 'PNG'
    output = root / 'art' / 'previews' / 'logo-intro.png'
    strip.save_render(str(output), scene=scene)
    verify = bpy.data.images.load(str(output), check_existing=False)
    actual = np.empty(len(verify.pixels), dtype=np.float32)
    verify.pixels.foreach_get(actual)
    actual = actual.reshape(expected.shape)
    opaque = expected[:, :, 3] > 0.99
    assert np.max(np.abs(actual[opaque] - expected[opaque])) < 2 / 255, 'Strip must preserve original render colors'
    print('LOGO_INTRO_STRIP_OK: HOP arrival / BRAWL arrival + chicken landing / wind-up / impact', flush=True)
