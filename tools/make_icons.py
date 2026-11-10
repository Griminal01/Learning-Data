"""
Draw the app icons (a rising bar chart on the course's dark blue) into app/icons/.
Needs Pillow:  pip install pillow
    python tools/make_icons.py
Only needed if you want to change the icon; the PNGs are committed.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "app" / "icons"
BLUE, WHITE, GREEN = (31, 78, 121), (255, 255, 255), (108, 192, 112)


def draw(size, maskable=False):
    s = 4  # draw big, then downsample for smooth edges
    big = size * s
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable:
        d.rectangle([0, 0, big, big], fill=BLUE)
        inset = big * 0.22  # keep the artwork inside the maskable safe zone (central 60 %)
    else:
        d.rounded_rectangle([0, 0, big - 1, big - 1], radius=big * 0.22, fill=BLUE)
        inset = big * 0.2
    left, right, bottom, top = inset, big - inset, big - inset, inset
    w = right - left
    gap = w * 0.1
    bw = (w - 2 * gap) / 3
    heights = [0.38, 0.64, 0.92]
    for i, h in enumerate(heights):
        x0 = left + i * (bw + gap)
        y0 = bottom - (bottom - top) * h
        d.rounded_rectangle([x0, y0, x0 + bw, bottom], radius=bw * 0.18, fill=GREEN if i == 2 else WHITE)
    return img.resize((size, size), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    draw(192).save(OUT / "icon-192.png", optimize=True)
    draw(512).save(OUT / "icon-512.png", optimize=True)
    draw(512, maskable=True).save(OUT / "icon-maskable-512.png", optimize=True)
    # iOS ignores transparency and adds its own rounding: use the full-bleed version.
    draw(180, maskable=True).convert("RGB").save(OUT / "apple-touch-icon.png", optimize=True)
    draw(32).save(OUT / "favicon-32.png", optimize=True)
    print("icons written to", OUT.relative_to(ROOT).as_posix())


if __name__ == "__main__":
    main()
