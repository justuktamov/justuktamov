import { Composition } from "remotion";
import { MainEdit } from "./edit/MainEdit";
import { TOTAL_FRAMES } from "./edit/timeline";
import { StyleDemo, StyleDemoProps } from "./StyleDemo";

const defaultProps: StyleDemoProps = {
  firstName: "Ism",
  lastName: "Familiya",
  roles: ["Producer", "Director", "Designer", "Editor", "Partner"],
  logo: "LOGO",
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="MainEdit" component={MainEdit} durationInFrames={TOTAL_FRAMES} fps={30} width={1280} height={720} />
      <Composition
        id="StyleDemo"
        component={StyleDemo}
        durationInFrames={218 + defaultProps.roles.length * 15 + 40}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultProps}
      />
    </>
  );
};
