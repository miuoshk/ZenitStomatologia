import type { Meta, StoryObj } from "@storybook/react-vite";
import { Sparkline } from "../charts/Sparkline";
import { KpiTile } from "./display";

const meta = {
  title: "Dane/KpiTile",
  component: KpiTile,
  args: { label: "Przychód", value: 54210, format: "pln", delta: 0.052, status: "dobrze", statusLabel: "Na celu" },
} satisfies Meta<typeof KpiTile>;
export default meta;
type S = StoryObj<typeof meta>;

export const Default: S = {};
export const WithSparkline: S = { args: { spark: <Sparkline label="Przychód, 12 tygodni" values={[3, 5, 4, 7, 6, 8, 9]} /> } };
export const Worse: S = { args: { delta: -0.08, status: "uwaga", statusLabel: "Uwaga" } };
