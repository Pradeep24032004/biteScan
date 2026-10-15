"""Draws the BiteScan app icon: a plate with a bite taken out, framed by scanner corners.

    .venv/bin/python make_icon.py   # writes ../assets/icon.png and ../assets/splash-icon.png
Drawn at 4x and downscaled for smooth edges. iOS rounds the corners itself, so the art is full-bleed.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ASSETS = Path(__file__).resolve().parent.parent / 'assets'
S = 4096  # supersampled canvas for a 1024px icon

GREEN_TOP = (38, 133, 89)
GREEN_BOTTOM = (19, 84, 55)
SAFFRON = (240, 140, 58)
CREAM = (255, 251, 243)
LEAF = (60, 160, 105)


def vertical_gradient(size, top, bottom):
    img = Image.new('RGB', (size, size))
    px = img.load()
    for y in range(size):
        t = y / (size - 1)
        c = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(size):
            px[x, y] = c
    return img


def draw_plate(size, background):
    """Plate + bite + food on a transparent layer, sized relative to `size`."""
    layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = size / 2
    r = size * 0.27

    # Soft shadow under the plate.
    shadow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse((c - r, c - r + size * 0.025, c + r, c + r + size * 0.025), fill=(0, 0, 0, 70))
    layer = Image.alpha_composite(layer, shadow.filter(ImageFilter.GaussianBlur(size * 0.02)))
    d = ImageDraw.Draw(layer)

    # Plate rim and inner well.
    d.ellipse((c - r, c - r, c + r, c + r), fill=CREAM + (255,))
    ri = r * 0.74
    d.ellipse((c - ri, c - ri, c + ri, c + ri), fill=(246, 239, 226, 255))

    # Food: a golden rolled dosa lying diagonally, with a chutney and a sambar bowl.
    dosa = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    dd = ImageDraw.Draw(dosa)
    length, thick = ri * 1.45, ri * 0.42
    box = (c - length / 2, c - thick / 2, c + length / 2, c + thick / 2)
    dd.rounded_rectangle(box, radius=thick / 2, fill=(236, 168, 62, 255))
    # Crisp fold lines.
    for k in (-0.22, 0.1, 0.42):
        x = c + length * k / 2 * 2 - length * 0.05
        dd.line([(x, c - thick * 0.42), (x + thick * 0.35, c + thick * 0.42)], fill=(205, 128, 40, 255), width=int(size * 0.008))
    dd.rounded_rectangle((box[0], box[1], box[2], c - thick * 0.18), radius=thick / 2, fill=(246, 196, 96, 120))
    dosa = dosa.rotate(32, resample=Image.BICUBIC, center=(c, c))
    layer = Image.alpha_composite(layer, dosa)
    d = ImageDraw.Draw(layer)

    bowl_r = ri * 0.2
    for (bx, by), fill in (((c - ri * 0.5, c + ri * 0.42), LEAF), ((c + ri * 0.12, c + ri * 0.6), SAFFRON)):
        d.ellipse((bx - bowl_r * 1.18, by - bowl_r * 1.18, bx + bowl_r * 1.18, by + bowl_r * 1.18), fill=CREAM + (255,))
        d.ellipse((bx - bowl_r, by - bowl_r, bx + bowl_r, by + bowl_r), fill=fill + (255,))

    # The bite: three overlapping circles cut from the top-right edge, filled with the background.
    bite_r = r * 0.2
    angle_points = [(0.62, -0.62), (0.80, -0.36), (0.36, -0.80)]
    mask = Image.new('L', (size, size), 0)
    md = ImageDraw.Draw(mask)
    for ax, ay in angle_points:
        bx, by = c + r * ax * 1.05, c + r * ay * 1.05
        md.ellipse((bx - bite_r, by - bite_r, bx + bite_r, by + bite_r), fill=255)
    cut = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    layer = Image.composite(cut, layer, mask)
    return layer


def draw_scan_corners(d, size, color, width):
    c = size / 2
    half = size * 0.36
    arm = size * 0.11
    for sx in (-1, 1):
        for sy in (-1, 1):
            x0, y0 = c + sx * half, c + sy * half
            d.line([(x0, y0), (x0 - sx * arm, y0)], fill=color, width=width)
            d.line([(x0, y0), (x0, y0 - sy * arm)], fill=color, width=width)
            # Round the joint and ends.
            for px, py in [(x0, y0), (x0 - sx * arm, y0), (x0, y0 - sy * arm)]:
                d.ellipse((px - width / 2, py - width / 2, px + width / 2, py + width / 2), fill=color)


def make_icon():
    bg = vertical_gradient(S, GREEN_TOP, GREEN_BOTTOM).convert('RGBA')
    # Subtle highlight in the top-left.
    glow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((-S * 0.3, -S * 0.4, S * 0.7, S * 0.5), fill=(255, 255, 255, 28))
    bg = Image.alpha_composite(bg, glow.filter(ImageFilter.GaussianBlur(S * 0.08)))

    corners = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    draw_scan_corners(ImageDraw.Draw(corners), S, SAFFRON + (255,), int(S * 0.034))
    bg = Image.alpha_composite(bg, corners)
    bg = Image.alpha_composite(bg, draw_plate(S, GREEN_TOP))
    icon = bg.convert('RGB').resize((1024, 1024), Image.LANCZOS)
    icon.save(ASSETS / 'icon.png')

    # Splash: just the plate + corners on transparent, shown over the app background colour.
    splash = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    draw_scan_corners(ImageDraw.Draw(splash), S, SAFFRON + (255,), int(S * 0.034))
    splash = Image.alpha_composite(splash, draw_plate(S, None))
    splash.resize((1024, 1024), Image.LANCZOS).save(ASSETS / 'splash-icon.png')
    # Android adaptive icon: art inside the central ~66% safe zone, background on its own layer.
    art = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    draw_scan_corners(ImageDraw.Draw(art), S, SAFFRON + (255,), int(S * 0.034))
    art = Image.alpha_composite(art, draw_plate(S, None))
    inner = art.resize((int(S * 0.62), int(S * 0.62)), Image.LANCZOS)
    fg = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    fg.paste(inner, ((S - inner.width) // 2, (S - inner.height) // 2), inner)
    fg.resize((1024, 1024), Image.LANCZOS).save(ASSETS / 'android-icon-foreground.png')
    vertical_gradient(1024, GREEN_TOP, GREEN_BOTTOM).save(ASSETS / 'android-icon-background.png')
    # Monochrome (themed icons): white silhouette of the foreground.
    alpha = fg.split()[3]
    mono = Image.new('RGBA', (S, S), (255, 255, 255, 0))
    mono.putalpha(alpha)
    mono.resize((1024, 1024), Image.LANCZOS).save(ASSETS / 'android-icon-monochrome.png')
    print('wrote', ASSETS / 'icon.png', 'splash-icon.png and Android adaptive icon layers')


if __name__ == '__main__':
    make_icon()
