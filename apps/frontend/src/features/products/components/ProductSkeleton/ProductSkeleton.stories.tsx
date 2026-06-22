import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductSkeleton } from "./ProductSkeleton";

const meta: Meta<typeof ProductSkeleton> = {
  title: "Features/Products/ProductSkeleton",
  component: ProductSkeleton,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 280 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProductSkeleton>;

export const Default: Story = {};

export const Grid: Story = {
  decorators: [
    (Story) => (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 280px)",
          gap: "1.5rem",
        }}
      >
        {Array(6)
          .fill(0)
          .map((_, i) => (
            <Story key={i} />
          ))}
      </div>
    ),
  ],
};
