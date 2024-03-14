const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const webpack = require('webpack');

const path = require('path')

module.exports = ((env, argv) => {

    return {
        mode: argv.mode === 'production' ? 'production' : 'development',

        // This is necessary because Figma's 'eval' works differently than normal eval
        devtool: argv.mode === 'production' ? false : 'inline-source-map',

        entry: {
            plugin: './src/main.ts', // The entry point for your plugin code
        },

        stats: {
            all: undefined,
            errorDetails: true
        },

        module: {
            rules: [
                // Converts TypeScript code to JavaScript
                { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },

                // Enables including CSS by doing "import './file.css'" in your TypeScript code
                { test: /\.css$/, use: [{ loader: 'style-loader' }, { loader: 'css-loader' }, { loader: 'postcss-loader' }] },

                // Allows you to use "<%= require('./file.svg') %>" in your HTML code to get a data URI
                { test: /\.(png|jpg|gif|webp|svg)$/, loader: 'url-loader' },
            ],
        },

        // Webpack tries these extensions for you if you omit the extension like "import './file'"
        resolve: { extensions: ['.tsx', '.ts', '.jsx', '.js', '.json', '.css'] },

        output: {
            publicPath: '/',
            filename: '[name].js',
            path: path.resolve(__dirname, 'dist'), // Compile into a folder called "dist"
        },

        // Tells Webpack to generate "ui.html" and to inline "ui.ts" into it
        plugins: [
            new webpack.DefinePlugin({
                'global': {} // Fix missing symbol error when running in developer VM
            }),
            new HtmlWebpackInlineSourcePlugin(HtmlWebpackPlugin)
        ],

        watch: false
    }
    
})