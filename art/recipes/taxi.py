from recipes.car import create as sedan


def create():
    v = sedan()
    colors = {'#EE5860': '#FFD23F', '#C63D4A': '#D9A429'}
    v.cells = {p: (colors.get(c, c), part) for p, (c, part) in v.cells.items()}
    # Cream roof sign with a black inset and yellow checker accents.
    v.box(4, 6, 7, 7, 3, 6, '#263242')
    v.box(4, 6, 8, 8, 3, 6, '#FFF4C2')
    v.box(5, 5, 8, 8, 6, 6, '#263242')
    for x in (4, 6):
        for d in (1, 8):
            v.box(x, x, 3, 3, d, d, '#263242')
    return v
