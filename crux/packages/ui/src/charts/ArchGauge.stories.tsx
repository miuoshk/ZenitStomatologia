import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArchGauge } from "./ArchGauge";

const meta = { title: "Wykresy/ArchGauge", component: ArchGauge, args: { value: 0.81, label: "01 NOWODWORSKA" } } satisfies Meta<typeof ArchGauge>;
export default meta;
type S = StoryObj<typeof meta>;

export const Default: S = {};
export const Empty: S = { args: { value: 0 } };
export const Table: S = { args: { asTable: true } };
