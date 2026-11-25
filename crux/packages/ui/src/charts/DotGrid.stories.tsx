import type { Meta, StoryObj } from "@storybook/react-vite";
import { DotGrid } from "./DotGrid";

const meta = { title: "Wykresy/DotGrid", component: DotGrid, args: { value: 64, label: "Konwersja planów" } } satisfies Meta<typeof DotGrid>;
export default meta;
type S = StoryObj<typeof meta>;

export const Default: S = {};
export const Table: S = { args: { asTable: true } };
