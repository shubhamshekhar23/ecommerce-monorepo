import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Order } from "../../interfaces";
import { OrderCard } from "./OrderCard";

const withQueryClient = (Story: React.ComponentType) => (
  <QueryClientProvider client={new QueryClient()}>
    <Story />
  </QueryClientProvider>
);

const meta: Meta<typeof OrderCard> = {
  title: "Features/Orders/OrderCard",
  component: OrderCard,
  parameters: {
    layout: "padded",
    nextjs: { appDirectory: true },
  },
  decorators: [
    withQueryClient,
    (Story) => (
      <div style={{ maxWidth: 480 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof OrderCard>;

const baseOrder: Order = {
  id: "ord-1",
  orderNumber: "ORD-20240001",
  userId: "user-1",
  items: [
    {
      id: "item-1",
      productId: "prod-1",
      productName: "Ceramic Mug",
      quantity: 2,
      price: 24.99,
      subtotal: 49.98,
    },
    {
      id: "item-2",
      productId: "prod-2",
      productName: "Linen Tote",
      quantity: 1,
      price: 34.99,
      subtotal: 34.99,
    },
  ],
  totalPrice: 84.97,
  status: "PENDING",
  paymentStatus: "PENDING",
  createdAt: "2024-03-15T10:30:00.000Z",
  updatedAt: "2024-03-15T10:30:00.000Z",
};

export const Pending: Story = {
  args: { order: baseOrder },
};

export const Processing: Story = {
  args: {
    order: { ...baseOrder, status: "PROCESSING", paymentStatus: "SUCCEEDED" },
  },
};

export const Shipped: Story = {
  args: {
    order: { ...baseOrder, status: "SHIPPED", paymentStatus: "SUCCEEDED" },
  },
};

export const Delivered: Story = {
  args: {
    order: { ...baseOrder, status: "DELIVERED", paymentStatus: "SUCCEEDED" },
  },
};

export const Cancelled: Story = {
  args: {
    order: { ...baseOrder, status: "CANCELLED", paymentStatus: "CANCELED" },
  },
};

export const PaymentFailed: Story = {
  args: { order: { ...baseOrder, status: "PENDING", paymentStatus: "FAILED" } },
};
