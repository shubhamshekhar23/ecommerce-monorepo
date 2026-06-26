import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Select } from "./Select";

const meta: Meta<typeof Select> = {
  title: "Components/Form/Select",
  component: Select,
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
type Story = StoryObj<typeof Select>;

const CountryOptions = () => (
  <>
    <option value="">Select a country</option>
    <option value="us">United States</option>
    <option value="gb">United Kingdom</option>
    <option value="ca">Canada</option>
    <option value="au">Australia</option>
  </>
);

export const Default: Story = {
  render: (args) => (
    <Select {...args}>
      <CountryOptions />
    </Select>
  ),
  args: {
    id: "country",
    label: "Country",
  },
};

export const WithHint: Story = {
  render: (args) => (
    <Select {...args}>
      <CountryOptions />
    </Select>
  ),
  args: {
    id: "country-hint",
    label: "Country",
    hint: "Used for shipping and tax calculation.",
  },
};

export const WithError: Story = {
  render: (args) => (
    <Select {...args}>
      <CountryOptions />
    </Select>
  ),
  args: {
    id: "country-error",
    label: "Country",
    error: "Please select a country.",
  },
};

export const Disabled: Story = {
  render: (args) => (
    <Select {...args}>
      <CountryOptions />
    </Select>
  ),
  args: {
    id: "country-disabled",
    label: "Country",
    defaultValue: "us",
    disabled: true,
  },
};
