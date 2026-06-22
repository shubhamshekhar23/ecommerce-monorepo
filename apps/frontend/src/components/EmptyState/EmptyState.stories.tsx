import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { EmptyState } from "./EmptyState";

const meta: Meta<typeof EmptyState> = {
  title: "Components/EmptyState",
  component: EmptyState,
  parameters: {
    layout: "centered",
    nextjs: { appDirectory: true },
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    title: "No products found",
    description: "Try adjusting your filters or search term.",
    action: { label: "Clear filters", onClick: fn() },
  },
};

export const WithLink: Story = {
  args: {
    title: "Your cart is empty",
    description: "Add something from the products page.",
    action: { label: "Browse products", href: "/products" },
  },
};

export const WithIcon: Story = {
  args: {
    icon: (
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4m0 4h.01" />
      </svg>
    ),
    title: "No orders yet",
    description: "Place your first order to see it here.",
    action: { label: "Start shopping", href: "/products" },
  },
};

export const TitleOnly: Story = {
  args: {
    title: "Nothing here",
  },
};
