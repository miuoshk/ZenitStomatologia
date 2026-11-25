import type { Meta, StoryObj } from "@storybook/react-vite";
import { LocationChip } from "./controls";

const meta = { title: "Nawigacja/LocationChip", component: LocationChip, args: { code: "01", name: "Nowodworska" } } satisfies Meta<typeof LocationChip>;
export default meta;
type S = StoryObj<typeof meta>;

export const Default: S = {};
export const Active: S = { args: { active: true, onClick: () => {} } };
