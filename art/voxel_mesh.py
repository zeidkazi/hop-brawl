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


def audit(cells, faces):
    """Check emitted closed surfaces conserve voxel volume, with no flat parts."""
    quads = rectangles(cells, faces)
    def cross(a, b):
        return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
    volume6 = 0
    for (a, b, c, d), color in quads:
        for p, q in ((b, c), (c, d)):
            product = cross(p, q)
            volume6 += sum(a[i] * product[i] for i in range(3))
    assert volume6 == len(cells) * 6, 'Closed surfaces must preserve the exact solid voxel volume'
    return len(quads)
