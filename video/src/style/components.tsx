import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, snap } from "./theme";

const center: React.CSSProperties = {
  justifyContent: "center",
  alignItems: "center",
  fontFamily: FONT,
};

// Thin Figma-like guide lines with size labels.
export const GridGuides: React.FC<{ color?: string; x?: number; y?: number }> = ({
  color = C.guide,
  x = 0,
  y = 0,
}) => {
  const frame = useCurrentFrame();
  const p = snap(frame / 15);
  const line = (style: React.CSSProperties) => (
    <div style={{ position: "absolute", background: color, ...style }} />
  );
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      {line({ left: `calc(50% + ${x - 120}px)`, top: 0, width: 1, height: `${p * 100}%` })}
      {line({ left: `calc(50% + ${x + 120}px)`, bottom: 0, width: 1, height: `${p * 100}%` })}
      {line({ top: `calc(50% + ${y - 60}px)`, left: 0, height: 1, width: `${p * 100}%` })}
      {line({ top: `calc(50% + ${y + 60}px)`, right: 0, height: 1, width: `${p * 100}%` })}
      <div
        style={{
          position: "absolute",
          left: `calc(50% + ${x - 190}px)`,
          top: `calc(50% + ${y - 8}px)`,
          fontSize: 10,
          color,
          opacity: p,
        }}
      >
        120px
      </div>
    </AbsoluteFill>
  );
};

// Text typed letter by letter, with an accent "ghost" copy trailing behind.
export const GhostType: React.FC<{
  text: string;
  color?: string;
  size?: number;
  framesPerChar?: number;
}> = ({ text, color = C.ink, size = 110, framesPerChar = 3 }) => {
  const frame = useCurrentFrame();
  const shown = Math.min(text.length, Math.floor(frame / framesPerChar) + 1);
  const ghostShown = Math.min(text.length, Math.max(0, Math.floor((frame - 4) / framesPerChar) + 1));
  const style: React.CSSProperties = {
    fontSize: size,
    fontWeight: 700,
    letterSpacing: -size * 0.04,
    position: "absolute",
    whiteSpace: "pre",
  };
  return (
    <AbsoluteFill style={center}>
      <div style={{ position: "relative" }}>
        <div style={{ ...style, position: "relative", visibility: "hidden" }}>{text}</div>
        <div style={{ ...style, left: -size * 0.08, top: size * 0.06, color: C.accent }}>
          {text.slice(0, ghostShown)}
        </div>
        <div style={{ ...style, left: 0, top: 0, color }}>{text.slice(0, shown)}</div>
      </div>
    </AbsoluteFill>
  );
};

// "Light Bold" name lockup that pops in.
export const NameLockup: React.FC<{ first: string; last: string; size?: number; exitAt?: number }> = ({
  first,
  last,
  size = 40,
  exitAt,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spring({ frame, fps, config: { damping: 14, stiffness: 160 } });
  const outP = exitAt === undefined ? 0 : snap((frame - exitAt) / 12);
  const scale = interpolate(inP, [0, 1], [0.6, 1]) * interpolate(outP, [0, 1], [1, 0.45]);
  return (
    <AbsoluteFill style={center}>
      <div style={{ fontSize: size, color: C.ink, transform: `scale(${scale})`, opacity: inP }}>
        <span style={{ fontWeight: 400 }}>{first} </span>
        <span style={{ fontWeight: 700 }}>{last}</span>
      </div>
    </AbsoluteFill>
  );
};

// Stylised eye that opens, with a cat-slit iris and a highlight.
export const Eye: React.FC<{ word?: string }> = ({ word }) => {
  const frame = useCurrentFrame();
  const open = snap(frame / 14);
  const irisIn = snap((frame - 6) / 14);
  const slit = interpolate(frame, [20, 40], [34, 12], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lookX = interpolate(frame, [0, 30, 60], [-60, 10, 0], { extrapolateRight: "clamp" });
  const wordX = interpolate(frame, [25, 70], [500, -500], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rays = Array.from({ length: 36 }, (_, i) => i * 10);
  return (
    <AbsoluteFill style={{ background: C.ink, ...center }}>
      <svg width={1000} height={470} viewBox="-380 -180 760 360" style={{ overflow: "visible" }}>
        <defs>
          <clipPath id="eyeClip">
            <path d="M-360 0 Q0 -330 360 0 Q0 330 -360 0 Z" transform={`scale(1 ${open})`} />
          </clipPath>
        </defs>
        <path d="M-360 0 Q0 -330 360 0 Q0 330 -360 0 Z" fill={C.paper} transform={`scale(1 ${open})`} />
        <g clipPath="url(#eyeClip)">
          <g transform={`translate(${lookX} 0) scale(${irisIn})`}>
            <circle cx={-14} r={118} fill={C.accent} opacity={0.55} />
            <circle r={110} fill={C.accent} stroke={C.accentDark} strokeWidth={5} />
            {rays.map((a) => (
              <line
                key={a}
                x1={0}
                y1={40}
                x2={0}
                y2={100}
                stroke={C.accentDark}
                strokeOpacity={0.35}
                strokeWidth={2}
                transform={`rotate(${a})`}
              />
            ))}
            <ellipse rx={slit} ry={95} fill={C.ink} />
            <circle cx={56} cy={-62} r={24} fill="white" />
          </g>
          {word ? (
            <text
              x={wordX}
              y={28}
              textAnchor="middle"
              fontFamily={FONT}
              fontSize={84}
              fill="white"
              stroke={C.ink}
              strokeWidth={1}
            >
              {word}
            </text>
          ) : null}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// Hand-drawn style squiggle that draws itself.
const Squiggle: React.FC<{ width: number; progress: number }> = ({ width, progress }) => {
  const waves = Math.round(width / 16);
  let d = "M0 6";
  for (let i = 0; i < waves; i++) d += ` q4 -6 8 0 q4 6 8 0`;
  const len = waves * 22;
  return (
    <svg width={width} height={12} style={{ display: "block", marginTop: 4 }}>
      <path d={d} fill="none" stroke={C.ink} strokeWidth={1.6} strokeDasharray={len} strokeDashoffset={len * (1 - progress)} />
    </svg>
  );
};

// "Creative ___" with the second word swapping on a fast beat.
export const WordSwap: React.FC<{ prefix: string; words: string[]; every?: number }> = ({
  prefix,
  words,
  every = 15,
}) => {
  const frame = useCurrentFrame();
  const idx = Math.min(words.length - 1, Math.floor(frame / every));
  const local = frame - idx * every;
  const p = snap(local / 6);
  return (
    <AbsoluteFill style={center}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, fontSize: 44, color: C.ink }}>
        <div>
          <div style={{ fontWeight: 400 }}>{prefix}</div>
          <Squiggle width={170} progress={snap(frame / 20)} />
        </div>
        <div style={{ position: "relative", overflow: "hidden", paddingBottom: 16 }}>
          <div
            style={{
              fontWeight: 700,
              transform: `translateY(${(1 - p) * 60}px)`,
              opacity: p,
            }}
          >
            {words[idx]}
          </div>
          <div
            style={{
              position: "absolute",
              right: -6,
              top: 2,
              width: 16,
              height: 16,
              borderRadius: 8,
              background: C.accent,
              transform: `scale(${interpolate(local, [0, 4, 8], [0, 1.3, 1], { extrapolateRight: "clamp" })})`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Bouncing accent dot, e.g. landing on top of a letter.
export const BounceDot: React.FC<{ x: number; y: number; size?: number }> = ({ x, y, size = 22 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = spring({ frame, fps, config: { damping: 8, stiffness: 200 } });
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: `calc(50% + ${x}px)`,
          top: `calc(50% + ${y - (1 - drop) * 200}px)`,
          width: size,
          height: size,
          borderRadius: size / 2,
          background: C.accent,
        }}
      />
    </AbsoluteFill>
  );
};

// Final logo card on ink background.
export const LogoOutro: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const p = snap(frame / 18);
  return (
    <AbsoluteFill style={{ background: C.ink, ...center }}>
      <div
        style={{
          color: "white",
          fontWeight: 700,
          fontSize: 34,
          letterSpacing: interpolate(p, [0, 1], [24, 4]),
          opacity: p,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
