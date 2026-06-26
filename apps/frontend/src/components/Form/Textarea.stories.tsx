import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Textarea } from "./Textarea";

const meta: Meta<typeof Textarea> = {
  title: "Components/Form/Textarea",
  component: Textarea,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 400 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: {
    id: "notes",
    label: "Order notes",
    placeholder: "Any special instructions for your order...",
    rows: 4,
  },
};

export const WithHint: Story = {
  args: {
    id: "bio",
    label: "Bio",
    placeholder: "Tell us about yourself",
    hint: "Max 500 characters.",
    rows: 4,
  },
};

export const WithError: Story = {
  args: {
    id: "review",
    label: "Review",
    defaultValue: "ok",
    error: "Review must be at least 20 characters.",
    rows: 4,
  },
};

export const Disabled: Story = {
  args: {
    id: "notes-disabled",
    label: "Order notes",
    defaultValue: "Leave at the front door.",
    disabled: true,
    rows: 4,
  },
};
