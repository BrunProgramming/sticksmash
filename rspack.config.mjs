import { defineConfig } from "@rspack/cli";
import pkg from '@rspack/core';
const { HtmlRspackPlugin } = pkg; // Correct import for HtmlRspackPlugin
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Define the browser targets
const targets = ["chrome >= 87", "edge >= 88", "firefox >= 78", "safari >= 14"];

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check the environment
const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  entry: {
    main: "./src/index.js"
  },
  output: {
    filename: 'main.js',
    path: resolve(__dirname, 'dist'),
    publicPath: isProduction ? 'https://brunprogramming.github.io/sticksmash/' : '/',
  },
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource', // Emits files and provides URLs
      },
      {
        test: /\.js$/,
        use: [
          {
            loader: "builtin:swc-loader", // Ensure correct loader name
            options: {
              jsc: {
                parser: {
                  syntax: "ecmascript",
                },
              },
              env: {
                targets // Ensure targets are correctly set
              }
            }
          }
        ]
      }
    ]
  },
  plugins: [new HtmlRspackPlugin({ template: "./index.html" })], // Use HtmlRspackPlugin correctly
  experiments: {
    css: true
  }
});

