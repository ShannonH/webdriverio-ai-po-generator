const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'production', // or 'development'
    entry: {
        content: './content.js',
        background: './background.js',
        local_classifier: './local_classifier.js', // Still an entry if it has imports
        devtools: './devtools.js', // NEW: DevTools script entry
        panel: './panel.js',     // NEW: DevTools panel script entry
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    resolve: {
        extensions: ['.js'],
        fallback: {
            "path": require.resolve("path-browserify")
        }
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: 'manifest.json', to: 'manifest.json' },
                // Remove popup.html if you're fully removing the popup
                { from: 'icons', to: 'icons' },
                { from: 'devtools.html', to: 'devtools.html' }, // NEW: Copy devtools.html
                { from: 'panel.html', to: 'panel.html' },     // NEW: Copy panel.html
            ],
        }),
    ],
    devtool: 'cheap-module-source-map',
};