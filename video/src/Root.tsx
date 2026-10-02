import { Composition } from "remotion";
import { StyleDemo, StyleDemoProps } from "./StyleDemo";

const defaultProps: StyleDemoProps = {
  firstName: "Ism",
  lastName: "Familiya",
  roles: ["Producer", "Director", "Designer", "Editor", "Partner"],
  logo: "LOGO",
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="StyleDemo"
      component={StyleDemo}
      durationInFrames={218 + defaultProps.roles.length * 15 + 40}
      fps={30}
      width={1280}
      height={720}
      defaultProps={defaultProps}
    />
  );
};
