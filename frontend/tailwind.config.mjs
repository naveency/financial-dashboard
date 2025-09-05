// Tailwind CSS v4 configuration
const config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'selector', // v4 uses 'selector' instead of 'class'
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
