import React from "react";
import { AbsoluteFill, Audio, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { C, snap } from "../style/theme";
import {
  BigOverlay,
  Calendar,
  Checklist,
  Counter,
  EyeQuestion,
  NewThings,
  Notebook,
  Outro,
  QuoteType,
  YearProgress,
} from "./scenes";
import { at, FPS, OUTRO_FRAMES, SEGMENTS, TALK_FRAMES } from "./timeline";

type Sfx = { name: string; at: number; vol?: number };
type Scene = {
  kind: "full" | "panel" | "overlay";
  from: number; // source seconds
  to: number;
  render: (dur: number, r: (src: number) => number) => React.ReactNode;
  sfx?: (dur: number, r: (src: number) => number) => Sfx[];
};

// All times are source-clip seconds; they are mapped onto the cut timeline.
const SCENES: Scene[] = [
  {
    kind: "full",
    from: 1.9,
    to: 3.6,
    render: (d, r) => (
      <Calendar dur={d} months={[{ name: "Oktyabr", at: r(1.98) }, { name: "Noyabr", at: r(2.6) }, { name: "Dekabr", at: r(3.15) }]} />
    ),
    sfx: (d, r) => [{ name: "pop", at: r(1.98) }, { name: "pop", at: r(2.6) }, { name: "pop", at: r(3.15) }],
  },
  {
    kind: "panel",
    from: 3.98,
    to: 7.3,
    render: (d) => <YearProgress dur={d} year="2026" pct={75} caption="Yil oxiriga 3 oy" />,
    sfx: () => [{ name: "riser", at: 4, vol: 0.18 }],
  },
  {
    kind: "overlay",
    from: 8.05,
    to: 11.2,
    render: (d) => <BigOverlay dur={d} big="3 OY" small="vaqt qoldi" />,
    sfx: () => [{ name: "impact", at: 0, vol: 0.55 }],
  },
  {
    kind: "panel",
    from: 13.99,
    to: 19.25,
    render: (d, r) => (
      <Checklist
        dur={d}
        title="2026 rejalar"
        items={[
          { text: "Yangi ko'nikma", at: r(14.6) },
          { text: "Sport", at: r(15.4) },
          { text: "Kitob o'qish", at: r(16.2) },
          { text: "Daromad", at: r(17.0) },
        ]}
      />
    ),
    sfx: (d, r) => [14.6, 15.4, 16.2, 17.0].map((s) => ({ name: "pop", at: r(s), vol: 0.35 })),
  },
  {
    kind: "full",
    from: 19.93,
    to: 25.13,
    render: (d, r) => (
      <QuoteType
        dur={d}
        lead="2026"
        words={[
          { w: "Mana shu", at: r(21.2) },
          { w: "narsalarni", at: r(22.5) },
          { w: "amalga oshiraman", at: r(23.3) },
        ]}
      />
    ),
    sfx: (d, r) => [21.2, 22.5, 23.3].map((s) => ({ name: "click", at: r(s), vol: 0.45 })),
  },
  {
    kind: "panel",
    from: 29.8,
    to: 34.64,
    render: (d) => <Notebook dur={d} label="Daftar" />,
    sfx: () => [{ name: "typing", at: 10, vol: 0.35 }, { name: "typing", at: 30, vol: 0.3 }],
  },
  {
    kind: "full",
    from: 35.11,
    to: 38.52,
    render: (d, r) => <EyeQuestion dur={d} first="Qanday edim?" second="Hozir qandayman?" switchAt={r(36.9)} />,
    sfx: (d, r) => [{ name: "whoosh", at: r(36.9), vol: 0.35 }],
  },
  {
    kind: "panel",
    from: 39.27,
    to: 43.24,
    render: (d, r) => (
      <Checklist
        dur={d}
        title="Checklist"
        items={[
          { text: "Qanday edim?", at: r(39.6), checkAt: r(40.6) },
          { text: "Hozir qandayman?", at: r(40.1), checkAt: r(41.4) },
          { text: "3 oylik reja", at: r(40.6), checkAt: r(42.3) },
        ]}
      />
    ),
    sfx: (d, r) => [
      ...[39.6, 40.1, 40.6].map((s) => ({ name: "pop", at: r(s), vol: 0.3 })),
      ...[40.6, 41.4, 42.3].map((s) => ({ name: "ding", at: r(s), vol: 0.3 })),
    ],
  },
  {
    kind: "full",
    from: 43.94,
    to: 48.82,
    render: (d, r) => <Counter dur={d} top="3 oy =" to={90} unit="KUN" bottom="Endi harakat qilamiz" bottomAt={r(45.7)} />,
    sfx: (d, r) => [
      ...Array.from({ length: 13 }, (_, i) => ({ name: "tick", at: 6 + i * 3, vol: 0.25 })),
      { name: "pop", at: r(45.7), vol: 0.4 },
    ],
  },
  {
    kind: "panel",
    from: 49.15,
    to: 54.61,
    render: (d, r) => (
      <NewThings dur={d} prefix="Yangi" words={[{ w: "bilim", at: r(49.5) }, { w: "tana", at: r(51.2) }, { w: "kasb", at: r(53.6) }]} />
    ),
    sfx: (d, r) => [49.5, 51.2, 53.6].map((s) => ({ name: "pop", at: r(s), vol: 0.4 })),
  },
];

const placed = SCENES.map((s) => {
  const start = at(s.from);
  const dur = Math.max(12, at(s.to) - start);
  const r = (src: number) => at(src) - start;
  return { ...s, start, dur, r };
});

// Speaker video: alternating punch-in on every jump cut, shrinks left during panel scenes.
const SpeakerVideo: React.FC = () => {
  const f = useCurrentFrame();
  let split = 0;
  for (const s of placed) {
    if (s.kind !== "panel") continue;
    const p = snap((f - s.start) / 10) * (1 - snap((f - (s.start + s.dur - 10)) / 10));
    split = Math.max(split, p);
  }
  const seg = SEGMENTS.findIndex((s) => f >= s.outFrom && f < s.outFrom + s.frames);
  const cur = SEGMENTS[Math.max(0, seg)];
  const punch = seg % 2 === 1 ? 1.14 : 1.0;
  const push = interpolate(f - cur.outFrom, [0, cur.frames], [1, 1.03]);
  return (
    <AbsoluteFill
      style={{
        transform: `translateX(${-23 * split}%) scale(${1 - 0.52 * split})`,
        borderRadius: 40 * split,
        overflow: "hidden",
        boxShadow: split > 0 ? `0 30px 80px rgba(11,13,26,${0.3 * split})` : undefined,
      }}
    >
      <AbsoluteFill style={{ transform: `scale(${punch * push})`, transformOrigin: "46% 32%" }}>
        {SEGMENTS.map((s, i) => (
          <Sequence key={i} from={s.outFrom} durationInFrames={s.frames}>
            <OffthreadVideo
              src={staticFile("footage/main.mp4")}
              muted
              trimBefore={Math.round(s.srcStart * FPS)}
              style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(1.2) contrast(1.06) saturate(1.08)" }}
            />
          </Sequence>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const MainEdit: React.FC = () => {
  const sfx: Sfx[] = [];
  for (const s of placed) {
    if (s.kind !== "overlay") {
      sfx.push({ name: "whoosh", at: s.start, vol: 0.3 });
      sfx.push({ name: "whoosh_down", at: s.start + s.dur - 9, vol: 0.2 });
    }
    for (const e of s.sfx?.(s.dur, s.r) ?? []) sfx.push({ ...e, at: s.start + e.at });
  }
  sfx.push({ name: "riser", at: TALK_FRAMES - 42, vol: 0.3 });
  sfx.push({ name: "impact", at: TALK_FRAMES, vol: 0.6 });

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Sequence durationInFrames={TALK_FRAMES}>
        <SpeakerVideo />
      </Sequence>
      {placed.map((s, i) => (
        <Sequence key={i} from={s.start} durationInFrames={s.dur}>
          {s.render(s.dur, s.r)}
        </Sequence>
      ))}
      <Sequence from={TALK_FRAMES}>
        <Outro text="Hali kech emas." sub="3 OY · 90 KUN" />
      </Sequence>

      {SEGMENTS.map((s, i) => (
        <Sequence key={`v${i}`} from={s.outFrom} durationInFrames={s.frames}>
          <Audio src={staticFile("audio/voice.wav")} trimBefore={Math.round(s.srcStart * FPS)} />
        </Sequence>
      ))}
      <Audio
        src={staticFile("audio/music.wav")}
        volume={(f) =>
          interpolate(f, [0, 8, TALK_FRAMES - 10, TALK_FRAMES + 5, TALK_FRAMES + OUTRO_FRAMES - 20, TALK_FRAMES + OUTRO_FRAMES], [0, 0.11, 0.11, 0.42, 0.42, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
      {sfx.map((e, i) => (
        <Sequence key={`s${i}`} from={Math.max(0, e.at)} durationInFrames={60}>
          <Audio src={staticFile(`audio/${e.name}.wav`)} volume={e.vol ?? 0.4} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
