import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppShell } from "./shell";

const meta = {
  title: "Layout/AppShell",
  component: AppShell,
  parameters: { layout: "fullscreen" },
  args: {
    activeId: "dzis",
    nav: [
      { id: "dzis", label: "Dziś" },
      { id: "kalendarz", label: "Kalendarz" },
      { id: "raporty", label: "Raporty" },
    ],
    header: "Dziś",
    children: "Treść",
  },
} satisfies Meta<typeof AppShell>;
export default meta;
type S = StoryObj<typeof meta>;

export const Default: S = {};
