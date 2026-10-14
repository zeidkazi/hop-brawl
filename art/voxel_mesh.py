"""Greedy, palette-preserving surface rectangles of closed voxel solids."""


def rectangles(cells, faces):
    occupied = {tuple(cell[:3]) for cell in cells}
    planes = {}
    exposed = 0
    for x, y, z, color in cells:
        position = (x, y, z)
        for direction, (normal, corners) in enumerate(faces):
            if tuple(position[i] + normal[i] for i in range(3)) in occupied:
                continue
            axis = next(i for i in range(3) if normal[i])
            u, v = [i for i in range(3) if i != axis]
            plane = position[axis] + (normal[axis] > 0)
            planes.setdefault((direction, plane, color), set()).add((position[u], position[v]))
            exposed += 1
    result = []
    covered = 0
    for (direction, plane, color), mask in sorted(planes.items()):
        normal, corners = faces[direction]
        axis = next(i for i in range(3) if normal[i])
        u, v = [i for i in range(3) if i != axis]
        while mask:
            a, b = min(mask)
            width = 1
            while (a + width, b) in mask:
                width += 1
            height = 1
            while all((a + i, b + height) in mask for i in range(width)):
                height += 1
            for i in range(width):
                for j in range(height):
                    mask.remove((a + i, b + j))
            covered += width * height
            quad = []
            for corner in corners:
                point = [0, 0, 0]
                point[axis] = plane
                point[u] = a + corner[u] * width
                point[v] = b + corner[v] * height
                quad.append(tuple(point))
            result.append((quad, color))
    assert covered == exposed, 'Greedy surfaces must cover every exposed voxel face exactly once'
    return result
