import type { Preview } from "@storybook/react-vite";
import "./storybook.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    viewport: {
      options: {
        ipad: {
          name: "iPad 10,9",
          styles: { width: "820px", height: "1180px" },
          type: "tablet",
        },
      },
    },
    a11y: { test: "error" },
  },
  globalTypes: {
    theme: {
      description: "Motyw",
      toolbar: {
        items: [
          { value: "light", title: "Jasny" },
          { value: "dark", title: "Ciemny" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    viewport: { value: "ipad", isRotated: false },
    theme: "light",
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals["theme"] === "dark" ? "dark" : "light";
      if (theme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      return Story();
    },
  ],
};

export default preview;
