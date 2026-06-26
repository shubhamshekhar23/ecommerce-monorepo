import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { PaginationMeta } from "../../interfaces";
import { Pagination } from "./Pagination";

const meta: Meta<typeof Pagination> = {
  title: "Features/Products/Pagination",
  component: Pagination,
  parameters: {
    layout: "padded",
    nextjs: { appDirectory: true },
  },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

const makeMeta = (
  page: number,
  pages: number,
  total: number,
): PaginationMeta => ({
  page,
  pages,
  total,
  limit: 20,
  hasMore: page < pages,
});

export const FirstPage: Story = {
  args: { meta: makeMeta(1, 5, 92) },
};

export const MiddlePage: Story = {
  args: { meta: makeMeta(3, 5, 92) },
};

export const LastPage: Story = {
  args: { meta: makeMeta(5, 5, 92) },
};

export const ManyPages: Story = {
  args: { meta: makeMeta(6, 20, 387) },
};

export const SinglePage: Story = {
  args: { meta: makeMeta(1, 1, 14) },
};
