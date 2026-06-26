import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Checkbox } from "./Checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "Components/Form/Checkbox",
  component: Checkbox,
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
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  args: {
    id: "terms",
    label: "I agree to the terms and conditions",
  },
};

export const Checked: Story = {
  args: {
    id: "newsletter",
    label: "Subscribe to newsletter",
    defaultChecked: true,
  },
};

export const WithError: Story = {
  args: {
    id: "terms-error",
    label: "I agree to the terms and conditions",
    error: "You must accept the terms to continue.",
  },
};

export const Disabled: Story = {
  args: {
    id: "terms-disabled",
    label: "I agree to the terms and conditions",
    defaultChecked: true,
    disabled: true,
  },
};
