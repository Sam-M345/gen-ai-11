module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontSize: {
        base: ["1rem", "1.5rem"], // Increase base font size
        "button-text": ["1rem", "1.2rem"], // Add specific button text size
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme("colors.gray.800"),
            maxWidth: "none",
            h1: {
              color: theme("colors.gray.900"),
              fontWeight: "700",
              fontSize: "1.7em",
              marginTop: "2em",
              marginBottom: "1em",
            },
            h2: {
              color: theme("colors.gray.900"),
              fontWeight: "600",
              fontSize: "1.7em",
              marginTop: "1.75em",
              marginBottom: "0.875em",
            },
            h3: {
              color: theme("colors.gray.900"),
              fontWeight: "600",
              fontSize: "1.5em",
              marginTop: "1.5em",
              marginBottom: "0.75em",
            },
            p: {
              marginTop: "1em",
              marginBottom: "1em",
              lineHeight: "1.75",
            },
            li: {
              marginTop: "0.5em",
              marginBottom: "0.5em",
            },
            "ul > li": {
              paddingLeft: "0.375em",
            },
            "ol > li": {
              paddingLeft: "0.375em",
            },
            code: {
              color: theme("colors.gray.900"),
              backgroundColor: theme("colors.gray.100"),
              paddingLeft: "0.25em",
              paddingRight: "0.25em",
              paddingTop: "0.125em",
              paddingBottom: "0.125em",
              borderRadius: "0.25em",
            },
            pre: {
              backgroundColor: theme("colors.gray.100"),
              padding: "1em",
              borderRadius: "0.5em",
            },
            strong: {
              color: theme("colors.gray.900"),
              fontWeight: "600",
            },
            blockquote: {
              borderLeftColor: theme("colors.blue.500"),
              backgroundColor: theme("colors.gray.50"),
              padding: "1em 1.5em",
              fontStyle: "italic",
              color: theme("colors.gray.600"),
            },
            a: {
              color: theme("colors.blue.600"),
              fontSize: "1rem",
              textDecoration: "underline",
              wordWrap: "break-word",
              wordBreak: "break-all",
              overflowWrap: "break-word",
              maxWidth: "100%",
              display: "inline-block",
              "&:hover": {
                color: theme("colors.blue.700"),
              },
              "h1 &, h2 &, h3 &, h4 &": {
                fontSize: "1rem",
              },
            },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
