import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** The docs' webpack 5 recipe: `new URL(…, import.meta.url)` emits the PDF.js worker as an asset. */
export default {
  entry: './src/main.jsx',
  output: {
    path: resolve(here, 'dist'),
    filename: '[name].[contenthash].js',
    assetModuleFilename: '[name].[contenthash][ext]',
    clean: true,
  },
  resolve: { extensions: ['.jsx', '.js', '.mjs'] },
  module: {
    rules: [
      {
        test: /\.jsx$/,
        loader: 'esbuild-loader',
        options: { loader: 'jsx', jsx: 'automatic', target: 'es2022' },
      },
      { test: /\.m?js$/, resolve: { fullySpecified: false } },
      { test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader'] },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ title: 'webpack consumer smoke test' }),
    new MiniCssExtractPlugin(),
  ],
  performance: { hints: false },
};
