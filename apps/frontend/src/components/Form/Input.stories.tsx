import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input } from "./Input";

const meta: Meta<typeof Input> = {
  title: "Components/Form/Input",
  component: Input,
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
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    id: "email",
    label: "Email address",
    type: "email",
    placeholder: "you@example.com",
  },
};

export const WithHint: Story = {
  args: {
    id: "username",
    label: "Username",
    placeholder: "john_doe",
    hint: "Only letters, numbers, and underscores.",
  },
};

export const WithError: Story = {
  args: {
    id: "email-error",
    label: "Email address",
    type: "email",
    defaultValue: "not-an-email",
    error: "Please enter a valid email address.",
  },
};

export const Required: Story = {
  args: {
    id: "full-name",
    label: "Full name",
    placeholder: "Jane Smith",
    required: true,
  },
};

export const Disabled: Story = {
  args: {
    id: "locked",
    label: "Account email",
    defaultValue: "jane@example.com",
    disabled: true,
    hint: "Contact support to change your email.",
  },
};

export const Password: Story = {
  args: {
    id: "password",
    label: "Password",
    type: "password",
    placeholder: "••••••••",
    required: true,
  },
};
