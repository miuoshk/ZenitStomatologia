import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";

const meta = { title: "Podstawy/Button", component: Button, args: { children: "Zapisz" } } satisfies Meta<typeof Button>;
export default meta;
type S = StoryObj<typeof meta>;

export const Primary: S = {};
export const Secondary: S = { args: { variant: "secondary" } };
export const Ghost: S = { args: { variant: "ghost" } };
export const Danger: S = { args: { variant: "danger", children: "Usuń" } };
export const Disabled: S = { args: { disabled: true } };
