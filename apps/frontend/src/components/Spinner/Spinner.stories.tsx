import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Spinner } from "./Spinner";

const meta: Meta<typeof Spinner> = {
  title: "Components/Spinner",
  component: Spinner,
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Small: Story = {
  args: { size: "sm", "aria-label": "Loading" },
};

export const Medium: Story = {
  args: { size: "md", "aria-label": "Loading" },
};

export const Large: Story = {
  args: { size: "lg", "aria-label": "Loading" },
};
