import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Palette taken from the reference video: ink, paper, terracotta accent.
export const C = {
  ink: "#0B0D1A",
  paper: "#EEF1F4",
  accent: "#D9935E",
  accentDark: "#8A5A3A",
  guide: "rgba(11,13,26,0.18)",
};

export const FONT = "Inter";

for (const weight of ["400", "700"]) {
  loadFont({
    family: FONT,
    url: staticFile(`fonts/inter-latin-${weight}-normal.woff2`),
    weight,
  });
}

// Snappy ease-out used for nearly every move in the reference.
export const snap = (t: number) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 4);
