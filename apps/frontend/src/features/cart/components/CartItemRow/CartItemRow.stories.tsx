import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CartItem } from "../../interfaces";
import { CartItemRow } from "./CartItemRow";

const withQueryClient = (Story: React.ComponentType) => (
  <QueryClientProvider client={new QueryClient()}>
    <Story />
  </QueryClientProvider>
);

const meta: Meta<typeof CartItemRow> = {
  title: "Features/Cart/CartItemRow",
  component: CartItemRow,
  parameters: {
    layout: "padded",
    nextjs: { appDirectory: true },
  },
  decorators: [
    withQueryClient,
    (Story) => (
      <div style={{ maxWidth: 640 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CartItemRow>;

const baseItem: CartItem = {
  id: "item-1",
  productId: "prod-1",
  quantity: 2,
  subtotal: 49.98,
  product: {
    id: "prod-1",
    name: "Handmade Ceramic Mug",
    slug: "handmade-ceramic-mug",
    price: 24.99,
    cost: 12,
    stock: 10,
    categoryId: "cat-1",
    isActive: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
};

export const Default: Story = {
  args: { item: baseItem },
};

export const SingleItem: Story = {
  args: { item: { ...baseItem, quantity: 1, subtotal: 24.99 } },
};

export const AtStockLimit: Story = {
  args: {
    item: {
      ...baseItem,
      quantity: 10,
      subtotal: 249.9,
      product: { ...baseItem.product, stock: 10 },
    },
  },
};

export const LowStock: Story = {
  args: {
    item: {
      ...baseItem,
      quantity: 2,
      product: { ...baseItem.product, stock: 3 },
    },
  },
};
