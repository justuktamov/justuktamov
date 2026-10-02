import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Eye, GridGuides } from "../style/components";
import { C, FONT, snap } from "../style/theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ---------- Wrappers ----------

// Full-screen B-roll card revealed with a circle wipe.
export const Full: React.FC<{ dur: number; bg?: string; children: React.ReactNode }> = ({
  dur,
  bg = C.paper,
  children,
}) => {
  const f = useCurrentFrame();
  const r = snap(f / 10) * (1 - snap((f - (dur - 8)) / 8));
  return (
    <AbsoluteFill style={{ clipPath: `circle(${r * 85}% at 50% 50%)`, background: bg, fontFamily: FONT }}>
      {children}
    </AbsoluteFill>
  );
};

// Right-hand panel used while the speaker video shrinks to the left.
export const Panel: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const f = useCurrentFrame();
  const p = snap((f - 4) / 10) * (1 - snap((f - (dur - 10)) / 8));
  return (
    <AbsoluteFill
      style={{
        left: "53%",
        width: "47%",
        justifyContent: "center",
        paddingLeft: 24,
        fontFamily: FONT,
        color: C.ink,
        opacity: p,
        transform: `translateX(${(1 - p) * 60}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// Text with the trailing accent "ghost" copy from the reference.
const Ghost: React.FC<{ children: string; size: number; color?: string; weight?: number; delay?: number }> = ({
  children,
  size,
  color = C.ink,
  weight = 700,
  delay = 0,
}) => {
  const f = useCurrentFrame() - delay;
  const p = snap(f / 8);
  const g = snap((f - 3) / 10);
  const style: React.CSSProperties = {
    fontSize: size,
    fontWeight: weight,
    letterSpacing: -size * 0.035,
    lineHeight: 1,
    whiteSpace: "pre",
  };
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div
        style={{
          ...style,
          position: "absolute",
          color: C.accent,
          left: interpolate(g, [0, 1], [-size * 0.25, -size * 0.06]),
          top: size * 0.05,
          opacity: g * 0.9,
        }}
      >
        {children}
      </div>
      <div style={{ ...style, position: "relative", color, opacity: p, transform: `translateY(${(1 - p) * size * 0.3}px)` }}>
        {children}
      </div>
    </div>
  );
};

const Squiggle: React.FC<{ width: number; progress: number; color?: string }> = ({ width, progress, color = C.ink }) => {
  const waves = Math.round(width / 16);
  let d = "M0 6";
  for (let i = 0; i < waves; i++) d += " q4 -6 8 0 q4 6 8 0";
  const len = waves * 22;
  return (
    <svg width={width} height={12} style={{ display: "block" }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.8} strokeDasharray={len} strokeDashoffset={len * (1 - progress)} />
    </svg>
  );
};

// ---------- Scenes ----------

export const Calendar: React.FC<{ dur: number; months: { name: string; at: number }[] }> = ({ dur, months }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Full dur={dur}>
      <GridGuides />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 36 }}>
        {months.map((m, i) => {
          const s = spring({ frame: f - m.at, fps, config: { damping: 12, stiffness: 180 } });
          return (
            <div
              key={m.name}
              style={{
                width: 230,
                height: 270,
                borderRadius: 22,
                background: "white",
                boxShadow: "0 20px 50px rgba(11,13,26,0.12)",
                overflow: "hidden",
                transform: `translateY(${(1 - s) * 80}px) scale(${0.7 + 0.3 * s}) rotate(${(i - 1) * 4 * (1 - s)}deg)`,
                opacity: Math.min(1, s * 1.5),
              }}
            >
              <div style={{ background: i === 2 ? C.accent : C.ink, color: "white", padding: "18px 22px", fontSize: 30, fontWeight: 700 }}>
                {m.name}
              </div>
              <div style={{ padding: "16px 22px", display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 7 }}>
                {Array.from({ length: 28 }, (_, d) => (
                  <div
                    key={d}
                    style={{ height: 18, borderRadius: 5, background: d === 20 && i === 2 ? C.accent : "rgba(11,13,26,0.08)" }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </Full>
  );
};

export const YearProgress: React.FC<{ dur: number; year: string; pct: number; caption: string }> = ({
  dur,
  year,
  pct,
  caption,
}) => {
  const f = useCurrentFrame();
  const p = snap((f - 12) / 30) * pct;
  return (
    <Panel dur={dur}>
      <Ghost size={150}>{year}</Ghost>
      <div style={{ marginTop: 34, width: 440, height: 22, borderRadius: 11, background: "rgba(11,13,26,0.1)", overflow: "hidden" }}>
        <div style={{ width: `${p}%`, height: "100%", background: C.ink, borderRadius: 11 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", width: 440, marginTop: 12, fontSize: 22 }}>
        <span style={{ opacity: interpolate(f, [30, 40], [0, 1], clamp) }}>{caption}</span>
        <span style={{ fontWeight: 700, color: C.accent }}>{Math.round(p)}%</span>
      </div>
    </Panel>
  );
};

export const BigOverlay: React.FC<{ dur: number; big: string; small: string }> = ({ dur, big, small }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 10, stiffness: 220 } });
  const out = 1 - snap((f - (dur - 8)) / 8);
  return (
    <AbsoluteFill style={{ fontFamily: FONT, opacity: out }}>
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(0,0,0,0) 30%, rgba(11,13,26,0.75) 100%)" }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-end", paddingRight: 90 }}>
        <div style={{ transform: `scale(${0.5 + 0.5 * s})`, transformOrigin: "right center", textAlign: "right" }}>
          <Ghost size={220} color="white">{big}</Ghost>
          <div style={{ color: "white", fontSize: 54, fontWeight: 400, marginTop: 6, opacity: interpolate(f, [8, 16], [0, 1], clamp) }}>
            {small}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export type Item = { text: string; at: number; checkAt?: number };

export const Checklist: React.FC<{ dur: number; title: string; items: Item[] }> = ({ dur, title, items }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Panel dur={dur}>
      <Ghost size={64}>{title}</Ghost>
      <div style={{ marginTop: 10, marginBottom: 26 }}>
        <Squiggle width={200} progress={snap((f - 8) / 20)} />
      </div>
      {items.map((it) => {
        const s = spring({ frame: f - it.at, fps, config: { damping: 14, stiffness: 200 } });
        const c = it.checkAt === undefined ? 0 : snap((f - it.checkAt) / 8);
        return (
          <div
            key={it.text}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              fontSize: 32,
              marginBottom: 18,
              opacity: s,
              transform: `translateX(${(1 - s) * 40}px)`,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                border: `2.5px solid ${C.ink}`,
                background: c > 0 ? C.accent : "transparent",
                borderColor: c > 0 ? C.accent : C.ink,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width={22} height={22} viewBox="0 0 22 22">
                <path d="M3 11 L9 17 L19 5" fill="none" stroke="white" strokeWidth={3.2} strokeLinecap="round" strokeDasharray={30} strokeDashoffset={30 * (1 - c)} />
              </svg>
            </div>
            <span style={{ fontWeight: c > 0 ? 700 : 400 }}>{it.text}</span>
          </div>
        );
      })}
    </Panel>
  );
};

export const QuoteType: React.FC<{ dur: number; lead: string; words: { w: string; at: number }[] }> = ({ dur, lead, words }) => {
  const f = useCurrentFrame();
  return (
    <Full dur={dur}>
      <GridGuides />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", color: C.ink }}>
        <Ghost size={170}>{lead}</Ghost>
        <div style={{ display: "flex", gap: 18, marginTop: 30, fontSize: 60 }}>
          {words.map(({ w, at }, i) => {
            const p = snap((f - at) / 7);
            return (
              <span key={w} style={{ fontWeight: i === words.length - 1 ? 700 : 400, opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
                {w}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
    </Full>
  );
};

export const Notebook: React.FC<{ dur: number; label: string }> = ({ dur, label }) => {
  const f = useCurrentFrame();
  const lines = 6;
  return (
    <Panel dur={dur}>
      <div
        style={{
          width: 420,
          height: 470,
          background: "white",
          borderRadius: 18,
          boxShadow: "0 24px 60px rgba(11,13,26,0.14)",
          position: "relative",
          transform: `rotate(${interpolate(f, [0, 20], [-6, -2], clamp)}deg)`,
          padding: "70px 40px 0 70px",
        }}
      >
        <div style={{ position: "absolute", top: 22, left: 70, fontSize: 30, fontWeight: 700 }}>{label}</div>
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} style={{ position: "absolute", left: 22, top: 40 + i * 48, width: 14, height: 14, borderRadius: 7, background: C.paper }} />
        ))}
        <svg width={320} height={380}>
          {Array.from({ length: lines }, (_, i) => {
            const w = 200 + ((i * 53) % 110);
            let d = `M0 ${30 + i * 58}`;
            for (let x = 0; x < w; x += 20) d += ` q5 -10 10 0 q5 8 10 0`;
            const p = snap((f - 10 - i * 8) / 10);
            return (
              <g key={i}>
                <line x1={0} x2={320} y1={42 + i * 58} y2={42 + i * 58} stroke="rgba(11,13,26,0.08)" />
                <path d={d} fill="none" stroke={i === 2 ? C.accent : C.ink} strokeWidth={2.4} strokeDasharray={w * 2} strokeDashoffset={w * 2 * (1 - p)} />
              </g>
            );
          })}
        </svg>
      </div>
    </Panel>
  );
};

export const EyeQuestion: React.FC<{ dur: number; first: string; second: string; switchAt: number }> = ({
  dur,
  first,
  second,
  switchAt,
}) => {
  const f = useCurrentFrame();
  return (
    <Full dur={dur} bg={f < switchAt ? C.ink : C.paper}>
      {f < switchAt ? (
        <Eye word={first} />
      ) : (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ fontSize: 30, marginBottom: 18, opacity: 0.6 }}>{first}</div>
          <FrameShift by={switchAt}>
            <Ghost size={110}>{second}</Ghost>
          </FrameShift>
        </AbsoluteFill>
      )}
    </Full>
  );
};

// Re-bases child animations so they start at `by`.
const FrameShift: React.FC<{ by: number; children: React.ReactNode }> = ({ by, children }) => {
  const f = useCurrentFrame();
  const p = snap((f - by) / 8);
  return <div style={{ opacity: p, transform: `scale(${0.85 + 0.15 * p})` }}>{children}</div>;
};

export const Counter: React.FC<{ dur: number; to: number; unit: string; top: string; bottom: string; bottomAt: number }> = ({
  dur,
  to,
  unit,
  top,
  bottom,
  bottomAt,
}) => {
  const f = useCurrentFrame();
  const n = Math.round(snap((f - 6) / 40) * to);
  const b = snap((f - bottomAt) / 8);
  return (
    <Full dur={dur}>
      <GridGuides />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", color: C.ink }}>
        <div style={{ fontSize: 40, marginBottom: 6 }}>{top}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <span style={{ fontSize: 240, fontWeight: 700, letterSpacing: -10, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{n}</span>
          <span style={{ fontSize: 70, fontWeight: 700, color: C.accent }}>{unit}</span>
        </div>
        <div style={{ marginTop: 20, fontSize: 44, opacity: b, transform: `translateY(${(1 - b) * 20}px)` }}>
          {bottom}
          <div style={{ marginTop: 6 }}>
            <Squiggle width={300} progress={snap((f - bottomAt - 4) / 16)} />
          </div>
        </div>
      </AbsoluteFill>
    </Full>
  );
};

export const NewThings: React.FC<{ dur: number; prefix: string; words: { w: string; at: number }[] }> = ({ dur, prefix, words }) => {
  const f = useCurrentFrame();
  let idx = 0;
  words.forEach((w, i) => {
    if (f >= w.at) idx = i;
  });
  const local = f - words[idx].at;
  const p = snap(local / 6);
  return (
    <Panel dur={dur}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 56, fontWeight: 400 }}>{prefix}</div>
        <Squiggle width={150} progress={snap(f / 18)} />
        <div style={{ position: "relative", height: 130, overflow: "hidden", marginTop: 6 }}>
          <div style={{ fontSize: 110, fontWeight: 700, letterSpacing: -4, transform: `translateY(${(1 - p) * 110}px)` }}>
            {words[idx].w}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          {words.map((w, i) => (
            <div key={w.w} style={{ width: 44, height: 8, borderRadius: 4, background: i <= idx && f >= w.at ? C.accent : "rgba(11,13,26,0.12)" }} />
          ))}
        </div>
      </div>
    </Panel>
  );
};

export const Outro: React.FC<{ text: string; sub: string }> = ({ text, sub }) => {
  const f = useCurrentFrame();
  const s = snap(f / 10);
  return (
    <AbsoluteFill style={{ background: C.ink, justifyContent: "center", alignItems: "center", fontFamily: FONT, clipPath: `circle(${s * 85}% at 50% 50%)` }}>
      <GridGuides color="rgba(255,255,255,0.14)" />
      <Ghost size={96} color="white" delay={6}>{text}</Ghost>
      <div style={{ color: "white", opacity: interpolate(f, [24, 34], [0, 0.7], clamp), fontSize: 26, marginTop: 22, letterSpacing: 6 }}>{sub}</div>
    </AbsoluteFill>
  );
};
