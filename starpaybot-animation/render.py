"""@STARPAYBOT logo reveal: star pops in, then letters pop in one by one.
Outputs green-screen MP4, white MP4 and transparent MOV (ProRes 4444)."""
import math, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
W, H, FPS, DUR = 1080, 1920, 30, 5.0
TEXT = "@STARPAYBOT"
FONT = "/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"
SIZE = 88
TRACK = 7  # extra letter spacing px
PURPLE = (43, 10, 140, 255)
ORANGE = (255, 159, 10, 255)
SS = 2  # supersampling for glyph sprites

font = ImageFont.truetype(FONT, SIZE * SS)
star_src = Image.open(os.path.join(HERE, "star.png")).convert("RGBA")
STAR = 124  # final star size px
GAP = 18

def ease_out_back(t, s=2.2):
    t = min(max(t, 0), 1) - 1
    return t * t * ((s + 1) * t + s) + 1

def ease_out_cubic(t):
    t = min(max(t, 0), 1)
    return 1 - (1 - t) ** 3

def ease_in_out(t):
    t = min(max(t, 0), 1)
    return t * t * (3 - 2 * t)

# glyph sprites (rendered big, scaled per frame)
asc, desc = font.getmetrics()
glyphs, adv = [], []
for i, ch in enumerate(TEXT):
    w = int(font.getlength(ch)) + 8 * SS
    im = Image.new("RGBA", (w, asc + desc), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((4 * SS, 0), ch, font=font, fill=ORANGE if ch == "@" else PURPLE)
    glyphs.append(im)
# advance from prefix lengths (keeps kerning)
pref = [font.getlength(TEXT[:i]) / SS + TRACK * i for i in range(len(TEXT) + 1)]
TEXT_W = pref[-1]
GH = (asc + desc) / SS

T_STAR, T_TXT, STEP, T_LET = 0.0, 0.75, 0.085, 0.38
T_SHINE = T_TXT + STEP * len(TEXT) + 0.45

def revealed(t):
    """continuous count of letters taking space"""
    return min(max((t - T_TXT) / STEP, 0), len(TEXT))

def sparkle(draw, cx, cy, r, col):
    pts = []
    for k in range(8):
        a = k * math.pi / 4
        rr = r if k % 2 == 0 else r * 0.22
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    draw.polygon(pts, fill=col)

def frame(t):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    c = revealed(t)
    n = int(c)
    tw = pref[n] + (pref[min(n + 1, len(TEXT))] - pref[n]) * ease_in_out(c - n)
    group = STAR + (GAP + tw) * ease_in_out(min(c, 1))
    x0 = (W - group) / 2
    cy = H / 2

    # star: pop + spin, then little bounce when shine passes
    ps = ease_out_back((t - T_STAR) / 0.6)
    bounce = 1 + 0.12 * math.sin(math.pi * min(max((t - T_SHINE) / 0.35, 0), 1))
    s = STAR * ps * bounce
    if s > 1:
        rot = -200 * (1 - ease_out_cubic((t - T_STAR) / 0.7))
        st = star_src.resize((int(s * SS), int(s * SS)), Image.LANCZOS).rotate(rot, Image.BICUBIC, expand=True)
        st = st.resize((max(1, st.width // SS), max(1, st.height // SS)), Image.LANCZOS)
        scx = x0 + STAR / 2
        img.alpha_composite(st, (int(scx - st.width / 2), int(cy - st.height / 2)))

    # sparkle burst around star on landing
    d = ImageDraw.Draw(img)
    bt = (t - 0.35) / 0.7
    if 0 < bt < 1:
        scx = x0 + STAR / 2
        for k in range(8):
            a = k * math.pi / 4 + 0.3
            dist = STAR * (0.55 + 0.6 * ease_out_cubic(bt))
            r = 16 * (1 - bt) * (1.0 if k % 2 == 0 else 0.6)
            sparkle(d, scx + dist * math.cos(a), cy + dist * math.sin(a), r, (255, 196, 30, 255))

    # letters
    tx = x0 + STAR + GAP
    top = cy - GH / 2 - 6
    for i, g in enumerate(glyphs):
        lt = (t - T_TXT - i * STEP) / T_LET
        if lt <= 0:
            continue
        sc = ease_out_back(lt, 2.6)
        if sc <= 0.01:
            continue
        dy = 70 * (1 - ease_out_cubic(lt))
        gw, gh = int(g.width / SS * sc), int(g.height / SS * sc)
        if gw < 1 or gh < 1:
            continue
        gi = g.resize((gw, gh), Image.LANCZOS)
        if lt < 0.4:  # quick fade in
            a = gi.getchannel("A").point(lambda v: int(v * lt / 0.4))
            gi.putalpha(a)
        gx = tx + pref[i] - 4 + (g.width / SS - gw) / 2
        gy = top + (g.height / SS - gh) / 2 + dy
        img.alpha_composite(gi, (int(gx), int(gy)))

    # shine sweep across the text (lighter band clipped to glyph alpha)
    sh = (t - T_SHINE) / 0.7
    if 0 < sh < 1:
        alpha = img.getchannel("A")
        band = Image.new("L", (W, H), 0)
        bx = x0 - 120 + (group + 240) * ease_in_out(sh)
        ImageDraw.Draw(band).polygon([(bx - 70, top + GH + 40), (bx + 20, top + GH + 40), (bx + 110, top - 40), (bx + 20, top - 40)], fill=110)
        from PIL import ImageChops
        mask = ImageChops.multiply(band, alpha)
        img.paste(Image.new("RGBA", (W, H), (255, 255, 255, 255)), (0, 0), mask)
        img.putalpha(alpha)
    return img

def enc(path, args):
    return subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba",
                             "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-"] + args + [path], stdin=subprocess.PIPE)

out = sys.argv[1] if len(sys.argv) > 1 else HERE
h264 = ["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart"]
procs = {
    (0, 255, 0): enc(os.path.join(out, "starpaybot_green.mp4"), h264),
    (255, 255, 255): enc(os.path.join(out, "starpaybot_white.mp4"), h264),
    None: enc(os.path.join(out, "starpaybot_transparent.mov"), ["-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le"]),
}
for f in range(int(DUR * FPS)):
    fr = frame(f / FPS)
    for bg, p in procs.items():
        if bg is None:
            p.stdin.write(fr.tobytes())
        else:
            b = Image.new("RGBA", (W, H), bg + (255,))
            b.alpha_composite(fr)
            p.stdin.write(b.tobytes())
for p in procs.values():
    p.stdin.close(); p.wait()
print("done")
