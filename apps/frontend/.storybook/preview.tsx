import type { Preview } from "@storybook/nextjs-vite";
import "@/styles/globals.scss";
import "./preview.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#ffffff" },
        { name: "canvas", value: "#f8fbff" },
        { name: "dark", value: "#0f1117" },
      ],
    },

    a11y: {
      test: "todo",
    },
  },
};

export default preview;
