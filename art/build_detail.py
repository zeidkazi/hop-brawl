"""Section 34 original CC0 voxel detail library. Blender performs all meshing, AO and export."""
import json
import bpy
from build_models import mesh_parts, bake, preview
from voxel_source import VoxelSource

def recipes():
    r = {}; green = '#76B84B'; cream = '#FFF6E5'; ink = '#273348'
    v = VoxelSource([5,4,5]); v.box(2,2,0,2,2,2,green).box(1,3,3,3,1,3,'#FF72AD').box(2,2,3,3,2,2,'#FFD23F'); r['flowers']=v
    v = VoxelSource([5,4,5]); v.box(2,2,0,3,2,2,green).box(0,0,0,1,1,2,'#A5D856').box(4,4,0,2,2,3,green); r['grass_tuft']=v
    v = VoxelSource([7,4,5]); v.box(0,6,0,1,1,3,green).box(1,5,2,3,0,4,'#95CE65'); r['small_bush']=v
    v = VoxelSource([5,3,5]); v.box(0,4,0,1,0,4,'#A87750').box(1,3,2,2,1,3,'#EAC18A').box(2,2,2,2,2,2,'#AC805B'); r['stump']=v
    v = VoxelSource([6,2,5]); v.box(0,2,0,0,0,2,'#BBC3B8').box(1,2,1,1,1,2,'#CFD6C7').box(4,5,0,0,3,4,'#ABBBAE'); r['pebbles']=v
    v = VoxelSource([10,4,3]); v.box(0,9,1,1,1,1,'#D5B082').box(1,2,0,3,0,2,'#E5C495').box(7,8,0,3,0,2,'#E5C495'); r['fence_piece']=v
    v = VoxelSource([7,1,7]); v.box(1,5,0,0,0,6,'#89CF61').box(0,6,0,0,1,5,'#89CF61').remove(3,6,0,0,4,6); r['lily_pad']=v
    v = VoxelSource([7,5,5]); v.box(1,5,0,2,1,3,cream).box(4,5,3,4,1,3,'#FFD76B').box(6,6,3,3,1,3,'#F29B3C').box(5,5,4,4,3,3,ink); r['duck']=v
    v = VoxelSource([9,2,5]); v.box(3,5,0,1,1,3,cream).box(0,2,1,1,1,2,ink).box(6,8,1,1,1,2,ink); r['bird']=v
    v = VoxelSource([7,2,5]); v.box(3,3,0,1,1,3,ink).box(0,2,1,1,0,4,'#FFC35C').box(4,6,1,1,0,4,'#FF93BB'); r['butterfly']=v
    for name, length, height, paint in [('bus',24,13,'#FFD23F'),('ice_cream_van',18,13,'#FFF6E5'),('sports_car',15,7,'#FF493F')]:
        v = VoxelSource([length,height,10]); v.box(1,length-2,2,3,1,8,paint)
        roof = height-2 if name!='sports_car' else 6
        start = 2 if name=='bus' else 3
        v.box(start,length-4,4,roof-1,1,8,'#79CCDE').box(start,length-4,roof,roof,1,8,paint)
        for x in range(start,length-3,4): v.box(x,x,4,roof-1,1,8,paint)
        v.box(length-4,length-4,4,roof-1,2,7,'#ADEDF0')
        for x in (2,length-5):
            for d in (0,8): v.box(x,x+2,0,2,d,d+1,ink)
        for d in (2,6): v.box(length-1,length-1,3,3,d,d+1,cream)
        if name=='bus': v.box(2,length-4,3,3,0,0,'#F6A82C')
        if name=='ice_cream_van':
            v.box(3,9,4,8,0,0,'#FF83B9').box(4,8,5,7,0,0,cream)
            v.box(7,9,roof+1,roof+1,4,5,'#FFB1CF')
        if name=='sports_car': v.box(1,2,5,5,0,9,ink).box(4,10,3,3,4,5,cream)
        r[name]=v
    return r

def build(root, config):
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.context.scene.world=bpy.data.worlds.new('DetailWorld')
    sources=recipes(); objects=[]; names=list(sources)
    for name, source in sources.items():
        parts=mesh_parts('detail_'+name,source.data(),config)
        for obj in parts: obj['detail_kind']=name
        objects+=parts
    for obj in objects:
        i=names.index(obj['detail_kind']); obj.location.x+=(i%4)*3; obj.location.y-=(i//4)*3
    bpy.context.view_layer.update(); bake(objects,config)
    for obj in objects: obj.location=(0,0,0)
    bpy.context.view_layer.update(); bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(root/'client/public/models/detail_props.glb'),export_format='GLB',use_selection=True,
        export_texcoords=False,export_extras=True,export_animations=False,export_all_vertex_colors=False,
        export_vertex_color='NAME',export_vertex_color_name='COLOR_0')
    (root/'art/voxels/detail_props.json').write_text(json.dumps({name:v.data() for name,v in sources.items()},separators=(',',':'))+'\n',encoding='utf-8')
    # One contact sheet of the exact exported geometry, before runtime placement.
    for obj in objects:
        i=names.index(obj['detail_kind']); obj.location.x+=(i%4)*2.8; obj.location.y-=(i//4)*2.5
    bpy.context.view_layer.update(); preview(objects,'detail_props',{**config,'PREVIEW_SIZE':1600})
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(root/'art/detail_props.blend'),compress=True)
    print('DETAIL_ASSETS_OK', len(names), (root/'client/public/models/detail_props.glb').stat().st_size,flush=True)
