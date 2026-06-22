import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Breadcrumb } from "./Breadcrumb";

const meta: Meta<typeof Breadcrumb> = {
  title: "Components/Breadcrumb",
  component: Breadcrumb,
  parameters: {
    layout: "padded",
    nextjs: { appDirectory: true },
  },
};

export default meta;
type Story = StoryObj<typeof Breadcrumb>;

export const ProductDetail: Story = {
  args: {
    items: [
      { label: "Home", href: "/" },
      { label: "Products", href: "/products" },
      { label: "Handmade Ceramic Mug" },
    ],
  },
};

export const OrderDetail: Story = {
  args: {
    items: [
      { label: "Home", href: "/" },
      { label: "Orders", href: "/orders" },
      { label: "Order #ORD-20240115" },
    ],
  },
};

export const RootOnly: Story = {
  args: {
    items: [{ label: "Home" }],
  },
};

export const Deep: Story = {
  args: {
    items: [
      { label: "Home", href: "/" },
      { label: "Admin", href: "/admin" },
      { label: "Products", href: "/admin/products" },
      { label: "Edit: Ceramic Mug" },
    ],
  },
};
