import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RadioGroup } from "./RadioGroup";

const meta: Meta<typeof RadioGroup> = {
  title: "Components/Form/RadioGroup",
  component: RadioGroup,
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
type Story = StoryObj<typeof RadioGroup>;

const shippingOptions = [
  { value: "standard", label: "Standard (5–7 days) — Free" },
  { value: "express", label: "Express (2–3 days) — $9.99" },
  { value: "overnight", label: "Overnight — $24.99" },
];

export const Default: Story = {
  args: {
    id: "shipping",
    name: "shipping",
    legend: "Shipping method",
    options: shippingOptions,
  },
};

export const WithSelection: Story = {
  args: {
    id: "shipping-selected",
    name: "shipping-selected",
    legend: "Shipping method",
    options: shippingOptions,
    value: "express",
  },
};

export const WithError: Story = {
  args: {
    id: "shipping-error",
    name: "shipping-error",
    legend: "Shipping method",
    options: shippingOptions,
    error: "Please select a shipping method.",
  },
};
