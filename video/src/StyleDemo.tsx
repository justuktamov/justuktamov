import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { BounceDot, Eye, GhostType, GridGuides, LogoOutro, NameLockup, WordSwap } from "./style/components";
import { C } from "./style/theme";

export type StyleDemoProps = {
  firstName: string;
  lastName: string;
  roles: string[];
  logo: string;
};

// Recreation of the reference video's structure; swap texts/footage per project.
export const StyleDemo: React.FC<StyleDemoProps> = ({ firstName, lastName, roles, logo }) => {
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Sequence durationInFrames={14}>
        <AbsoluteFill style={{ background: C.ink }}>
          <GridGuides color="rgba(255,255,255,0.25)" />
          <GhostType text="H" color="white" />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={14} durationInFrames={30}>
        <GridGuides />
        <GhostType text="Hello" />
      </Sequence>
      <Sequence from={44} durationInFrames={20}>
        <GhostType text="I'm" size={130} framesPerChar={1} />
      </Sequence>
      <Sequence from={64} durationInFrames={30}>
        <NameLockup first={firstName} last={lastName} />
      </Sequence>
      <Sequence from={94} durationInFrames={24}>
        <GhostType text="Your" size={70} framesPerChar={2} />
        <Sequence from={10}>
          <BounceDot x={-58} y={-60} />
        </Sequence>
      </Sequence>
      <Sequence from={118} durationInFrames={70}>
        <Eye word="Creative" />
      </Sequence>
      <Sequence from={188} durationInFrames={roles.length * 15}>
        <WordSwap prefix="Creative" words={roles} />
      </Sequence>
      <Sequence from={188 + roles.length * 15} durationInFrames={30}>
        <NameLockup first={firstName} last={lastName} size={28} exitAt={14} />
      </Sequence>
      <Sequence from={218 + roles.length * 15}>
        <LogoOutro text={logo} />
      </Sequence>
    </AbsoluteFill>
  );
};
