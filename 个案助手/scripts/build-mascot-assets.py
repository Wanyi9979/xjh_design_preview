"""Make transparent launcher assets from the existing CARES mascot (Pillow)."""

from pathlib import Path
import math

from PIL import Image


PUBLIC = Path(__file__).resolve().parents[1] / "public"
source = Image.open(PUBLIC / "cares-mascot.png").convert("RGBA")
# Keep the whole hood, face, wave and collar; lean toward the page from its edge.
portrait = source.crop((0, 0, source.width, 1100))
portrait = portrait.rotate(12, resample=Image.Resampling.BICUBIC, expand=True)
portrait = portrait.crop(portrait.getchannel("A").getbbox())
portrait.thumbnail((296, 296), Image.Resampling.LANCZOS)
sprite = Image.new("RGBA", (320, 320))
sprite.alpha_composite(portrait, ((320 - portrait.width) // 2, (320 - portrait.height) // 2))
sprite.save(PUBLIC / "cares-mascot-peek.png", optimize=True)

# A shareable transparent GIF. Every frame uses one palette; index 0 is alpha.
size = 192
art = sprite.resize((size, size), Image.Resampling.LANCZOS)
frames = []
for frame_number in range(72):
    phase = frame_number / 72
    if phase < .64:
        progress = 0
    elif phase < .78:
        progress = (1 - math.cos(math.pi * (phase - .64) / .14)) / 2
    elif phase < .88:
        progress = 1
    else:
        progress = (1 + math.cos(math.pi * (phase - .88) / .12)) / 2
    frame = Image.new("RGBA", (size, size))
    frame.alpha_composite(art, (round(58 - 34 * progress), 0))
    frames.append(frame)

palette_source = Image.new("RGB", (size * 3, size))
for index, frame in enumerate((frames[0], frames[55], frames[61])):
    palette_source.paste(frame.convert("RGB"), (index * size, 0))
palette = palette_source.quantize(colors=255, method=Image.Quantize.MEDIANCUT)
palette_colors = [0, 0, 0] + palette.getpalette()[:765]
indexed_frames = []
for frame in frames:
    indexed = frame.convert("RGB").quantize(palette=palette, dither=Image.Dither.NONE)
    alpha = frame.getchannel("A").tobytes()
    indices = indexed.tobytes()
    output = Image.frombytes("P", frame.size, bytes(index + 1 if opacity >= 128 else 0 for index, opacity in zip(indices, alpha)))
    output.putpalette(palette_colors)
    indexed_frames.append(output)
indexed_frames[0].save(PUBLIC / "cares-mascot-peek.gif", save_all=True, append_images=indexed_frames[1:], duration=80, loop=0, disposal=2, transparency=0, optimize=False)
print("Saved cares-mascot-peek.png and cares-mascot-peek.gif")
