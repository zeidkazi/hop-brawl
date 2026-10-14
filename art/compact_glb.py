"""Lossless positions, byte vertex colors/normals using glTF mesh quantization."""
import json
import struct


def compact(path):
    raw = path.read_bytes()
    json_size = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + json_size])
    binary = raw[28 + json_size:]
    semantics = {}
    for mesh in doc['meshes']:
        mesh.pop('name', None)
        for primitive in mesh['primitives']:
            semantics.update({index: name for name, index in primitive['attributes'].items()})
    result, views = bytearray(), []
    for index, accessor in enumerate(doc['accessors']):
        view = doc['bufferViews'][accessor['bufferView']]
        count = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[accessor['type']]
        fmt, size = {5126: ('f', 4), 5123: ('H', 2), 5125: ('I', 4), 5121: ('B', 1)}[accessor['componentType']]
        stride = view.get('byteStride', count * size)
        start = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
        payload = bytearray()
        semantic = semantics.get(index)
        for i in range(accessor['count']):
            values = struct.unpack_from('<' + fmt * count, binary, start + i * stride)
            if semantic == 'NORMAL':
                payload += struct.pack('<bbbB', *(max(-127, min(127, round(v * 127))) for v in values), 0)
            elif semantic == 'COLOR_0':
                payload += bytes(round(v / 257) for v in values)
            else:
                payload += struct.pack('<' + fmt * count, *values)
        while len(result) % 4: result.append(0)
        new_view = {'buffer': 0, 'byteOffset': len(result), 'byteLength': len(payload)}
        if 'target' in view: new_view['target'] = view['target']
        if semantic in ('NORMAL', 'COLOR_0'):
            accessor['componentType'] = 5120 if semantic == 'NORMAL' else 5121
            accessor['normalized'] = True
            new_view['byteStride'] = 4
        accessor['bufferView'] = len(views)
        accessor.pop('byteOffset', None)
        views.append(new_view); result += payload
    for node in doc['nodes']:
        extra = node.get('extras', {})
        for key in ('text_font', 'variant', 'extrude', 'bevel', 'remesh_depth', 'ao_min', 'ao_max'):
            extra.pop(key, None)
    doc['bufferViews'] = views
    doc['buffers'] = [{'byteLength': len(result)}]
    for key in ('extensionsUsed', 'extensionsRequired'):
        doc.setdefault(key, []).append('KHR_mesh_quantization')
    data = json.dumps(doc, separators=(',', ':')).encode()
    data += b' ' * (-len(data) % 4); result += b'\0' * (-len(result) % 4)
    path.write_bytes(struct.pack('<III', 0x46546C67, 2, 28 + len(data) + len(result))
        + struct.pack('<II', len(data), 0x4E4F534A) + data
        + struct.pack('<II', len(result), 0x004E4942) + result)
