export const FPS = 30;

// Speech intervals in the source clip (seconds), from silence detection.
const SPEECH: [number, number][] = [
  [1.98, 3.45], [3.98, 7.21], [8.05, 11.95], [12.43, 13.48], [13.99, 19.22],
  [19.93, 25.13], [25.67, 27.79], [28.44, 29.41], [29.8, 32.44], [32.93, 34.64],
  [35.11, 38.52], [39.27, 43.24], [43.94, 48.82], [49.15, 50.57], [51.12, 52.52],
  [52.87, 53.28], [53.55, 54.61],
];
const PAD_IN = 0.08;
const PAD_OUT = 0.14;
const MIN_GAP = 0.18; // gaps shorter than this are kept instead of cut

export type Segment = { srcStart: number; srcEnd: number; outFrom: number; frames: number };

const buildSegments = (): Segment[] => {
  const merged: [number, number][] = [];
  for (const [s, e] of SPEECH) {
    const a = Math.max(0, s - PAD_IN);
    const b = e + PAD_OUT;
    const last = merged[merged.length - 1];
    if (last && a - last[1] < MIN_GAP) last[1] = b;
    else merged.push([a, b]);
  }
  let out = 0;
  return merged.map(([srcStart, srcEnd]) => {
    const frames = Math.round((srcEnd - srcStart) * FPS);
    const seg = { srcStart, srcEnd, outFrom: out, frames };
    out += frames;
    return seg;
  });
};

export const SEGMENTS = buildSegments();
export const TALK_FRAMES = SEGMENTS.reduce((n, s) => n + s.frames, 0);
export const OUTRO_FRAMES = 75;
export const TOTAL_FRAMES = TALK_FRAMES + OUTRO_FRAMES;

// Map a source timestamp (seconds) to an output frame on the cut timeline.
export const at = (src: number): number => {
  for (const s of SEGMENTS) {
    if (src < s.srcStart) return s.outFrom;
    if (src <= s.srcEnd) return s.outFrom + Math.round((src - s.srcStart) * FPS);
  }
  return TALK_FRAMES;
};
