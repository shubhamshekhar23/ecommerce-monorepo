import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { within, userEvent, expect } from "storybook/test";
import { ProductCard } from "./ProductCard";
import { useAuthStore } from "@/store/auth.store";
import type { Product } from "../../interfaces";

const baseProduct: Product = {
  id: "prod-1",
  name: "Handmade Ceramic Mug",
  slug: "handmade-ceramic-mug",
  description: "A beautifully handcrafted ceramic mug.",
  price: 24.99,
  cost: 12,
  stock: 5,
  categoryId: "cat-1",
  categoryName: "Ceramics",
  images: [
    {
      id: "img-1",
      url: "https://picsum.photos/seed/mug/400/400",
      altText: "Ceramic mug on a wooden table",
      isMain: true,
      order: 0,
    },
  ],
  variants: [],
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const meta: Meta<typeof ProductCard> = {
  title: "Features/Products/ProductCard",
  component: ProductCard,
  parameters: {
    layout: "padded",
    nextjs: { appDirectory: true },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 280 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProductCard>;

export const Default: Story = {
  args: {
    product: baseProduct,
    priority: false,
  },
  decorators: [
    (Story) => {
      useAuthStore.setState({ status: "authenticated" });
      return <Story />;
    },
  ],
};

export const OutOfStock: Story = {
  args: {
    product: { ...baseProduct, stock: 0 },
  },
  decorators: [
    (Story) => {
      useAuthStore.setState({ status: "authenticated" });
      return <Story />;
    },
  ],
};

export const NoImage: Story = {
  args: {
    product: { ...baseProduct, images: [] },
  },
  decorators: [
    (Story) => {
      useAuthStore.setState({ status: "authenticated" });
      return <Story />;
    },
  ],
};

export const Unauthenticated: Story = {
  args: { product: baseProduct },
  decorators: [
    (Story) => {
      useAuthStore.setState({ status: "unauthenticated" });
      return <Story />;
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const addBtn = canvas.getByRole("button", { name: /add to cart/i });
    await expect(addBtn).toBeInTheDocument();
    await userEvent.click(addBtn);
    // Unauthenticated → redirects to /login (navigation is mocked, button stays)
    await expect(addBtn).toBeInTheDocument();
  },
};

export const WithSearchHighlight: Story = {
  args: {
    product: baseProduct,
    searchQuery: "Ceramic",
  },
  decorators: [
    (Story) => {
      useAuthStore.setState({ status: "authenticated" });
      return <Story />;
    },
  ],
};
