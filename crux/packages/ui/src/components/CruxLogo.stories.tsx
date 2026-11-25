import type { Meta, StoryObj } from "@storybook/react-vite";
import { CruxLogo } from "./CruxLogo";

const meta = { title: "Marka/CruxLogo", component: CruxLogo, args: { size: 96 } } satisfies Meta<typeof CruxLogo>;
export default meta;
type S = StoryObj<typeof meta>;

export const Default: S = {};
export const Animated: S = { args: { animate: true } };
