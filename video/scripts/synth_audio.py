"""Procedurally synthesise background music and SFX (no external assets)."""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
import soundfile as sf
import os, sys

SR = 44100
OUT = sys.argv[1] if len(sys.argv) > 1 else "public/audio"
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

def t(d): return np.arange(int(d * SR)) / SR
def filt(x, kind, f, order=2):
    return sosfilt(butter(order, f, btype=kind, fs=SR, output="sos"), x)
def env(n, a, r):
    e = np.ones(n); na = max(1, int(a * SR)); e[:na] = np.linspace(0, 1, na)
    e *= np.exp(-np.arange(n) / (r * SR)); return e
def norm(x, peak=0.9): return x / (np.max(np.abs(x)) + 1e-9) * peak
def save(name, x):
    if x.ndim == 1: x = np.stack([x, x], 1)
    sf.write(f"{OUT}/{name}.wav", x.astype(np.float32), SR)
def reverb(x, dur=1.8, mix=0.25):
    n = int(dur * SR); ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (0.35 * SR))
    ir = filt(ir, "low", 6000); wet = fftconvolve(x, ir)[: len(x)]
    return x * (1 - mix) + norm(wet, np.max(np.abs(x))) * mix

# ---------- SFX ----------
def whoosh(d=0.55, up=True):
    n = int(d * SR); x = rng.standard_normal(n); out = np.zeros(n); blk = 512
    for i in range(0, n, blk):
        p = i / n; fc = 300 + (5000 if up else 3000) * (p if up else 1 - p)
        seg = x[max(0, i - 2048): i + blk]
        out[i:i + blk] = filt(seg, "band", [fc * 0.6, min(fc * 1.6, 20000)])[-len(out[i:i + blk]):]
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** 2
    return norm(out * e, 0.7)
def pop():
    tt = t(0.12); f = 900 * np.exp(-tt * 30) + 250
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(tt), 0.002, 0.03), 0.8)
def click():
    tt = t(0.04); x = rng.standard_normal(len(tt)) * env(len(tt), 0.0005, 0.006)
    return norm(filt(x, "high", 2500) + 0.5 * np.sin(2 * np.pi * 1800 * tt) * env(len(tt), 0.0005, 0.01), 0.6)
def ding():
    tt = t(1.2); x = sum(a * np.sin(2 * np.pi * f * tt) for f, a in [(1318.5, 1), (1975.5, .5), (2637, .25)])
    return norm(reverb(x * env(len(tt), 0.003, 0.35), 1.2, 0.2), 0.55)
def riser(d=1.4):
    tt = t(d); f = 200 * (8 ** (tt / d)); tone = np.sin(2 * np.pi * np.cumsum(f) / SR)
    noise = filt(rng.standard_normal(len(tt)), "high", 1500) * (tt / d) ** 2
    return norm((0.5 * tone + noise) * (tt / d) ** 1.5, 0.6)
def impact():
    tt = t(1.4); f = 90 * np.exp(-tt * 4) + 38
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(tt), 0.002, 0.35)
    hit = filt(rng.standard_normal(len(tt)), "low", 3000) * env(len(tt), 0.001, 0.05)
    return norm(reverb(boom + 0.5 * hit, 1.5, 0.15), 0.9)
def typing(n=6, gap=0.07):
    out = np.zeros(int((n * gap + 0.1) * SR))
    for i in range(n):
        c = click() * rng.uniform(0.5, 1); s = int((i * gap + rng.uniform(0, 0.02)) * SR)
        out[s:s + len(c)] += c
    return norm(out, 0.5)
def tick():
    tt = t(0.05); return norm(np.sin(2 * np.pi * 2400 * tt) * env(len(tt), 0.0005, 0.008), 0.5)

save("whoosh", whoosh()); save("whoosh_down", whoosh(0.45, False)); save("pop", pop())
save("click", click()); save("ding", ding()); save("riser", riser()); save("impact", impact())
save("typing", typing()); save("tick", tick())

# ---------- Music: minimal lo-fi bed, 92 BPM, Am7 - Fmaj7 - Cmaj7 - G6 ----------
BPM = 92; beat = 60 / BPM; bars = 24; L = int(bars * 4 * beat * SR) + SR * 2
mix = np.zeros((L, 2))
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def add(x, start, pan=0.0, gain=1.0):
    s = int(start * SR); e = min(L, s + len(x)); x = x[: e - s] * gain
    mix[s:e, 0] += x * (1 - pan) ** 0.5; mix[s:e, 1] += x * (1 + pan) ** 0.5
chords = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 64]]
roots = [45, 41, 48, 43]
def epiano(m, d):
    tt = t(d); f = mtof(m)
    x = np.sin(2 * np.pi * f * tt + 0.8 * np.sin(2 * np.pi * f * 2 * tt) * np.exp(-tt * 3))
    return x * env(len(tt), 0.005, 0.9) * 0.25
def pad(m, d):
    tt = t(d); f = mtof(m)
    x = sum(np.sign(np.sin(2 * np.pi * f * (1 + dt) * tt)) for dt in (-0.004, 0, 0.004))
    x = filt(x, "low", 900); a = np.minimum(1, tt / 0.6) * np.minimum(1, (d - tt) / 0.6)
    return x * a * 0.04
def kick():
    tt = t(0.45); f = 110 * np.exp(-tt * 25) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(tt), 0.001, 0.12)
def snare():
    tt = t(0.3); n = filt(rng.standard_normal(len(tt)), "band", [1200, 6000])
    return (n * env(len(tt), 0.001, 0.07) + 0.3 * np.sin(2 * np.pi * 190 * tt) * env(len(tt), 0.001, 0.04)) * 0.5
def hat(open_=False):
    tt = t(0.2); n = filt(rng.standard_normal(len(tt)), "high", 7000)
    return n * env(len(tt), 0.0005, 0.06 if open_ else 0.018) * 0.22
def bass(m, d):
    tt = t(d); x = np.sin(2 * np.pi * mtof(m) * tt); x = np.tanh(2 * x)
    return filt(x, "low", 300) * env(len(tt), 0.01, d * 0.8) * 0.35
for b in range(bars):
    c = b % 4; t0 = b * 4 * beat; full = b >= 2  # 2-bar soft intro
    for m in chords[c]:
        add(pad(m, 4 * beat + 0.3), t0, rng.uniform(-.4, .4))
    for i, off in enumerate([0, 1.5, 2.5, 3.25] if full else [0, 2]):
        for m in chords[c][1:] if i % 2 else chords[c][:3]:
            add(epiano(m + 12, 1.2), t0 + off * beat + rng.uniform(0, .012), rng.uniform(-.5, .5), 0.8)
    if full:
        for k in [0, 1.75, 2.5]: add(kick(), t0 + k * beat, 0, 0.9)
        for s_ in [1, 3]: add(snare(), t0 + s_ * beat, 0.05, 0.6)
        for h in range(8):
            sw = 0.03 if h % 2 else 0
            add(hat(h == 7), t0 + h * 0.5 * beat + sw, 0.3, 0.9 if h % 2 == 0 else 0.6)
        add(bass(roots[c], 2 * beat), t0, 0, 1); add(bass(roots[c], 1.5 * beat), t0 + 2.5 * beat, 0, 0.9)
# vinyl crackle + warmth
crackle = (rng.random(L) > 0.9993) * rng.standard_normal(L) * 0.15 + filt(rng.standard_normal(L), "band", [400, 3000]) * 0.004
mix += crackle[:, None]
mix = np.stack([reverb(mix[:, 0], 2.0, 0.18), reverb(mix[:, 1], 2.1, 0.18)], 1)
mix = filt(mix.T, "low", 9000).T
fade = int(3 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix = np.tanh(norm(mix, 0.95) * 1.2) * 0.85
sf.write(f"{OUT}/music.wav", mix.astype(np.float32), SR)
print("done", L / SR)
