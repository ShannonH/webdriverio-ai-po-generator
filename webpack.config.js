const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'production', // or 'development'
    entry: {
        content: './src/content.js',
        background: './src/background.js',
        local_classifier: './src/local_classifier.js', // Still an entry if it has imports
        devtools: './src/devtools.js', // NEW: DevTools script entry
        panel: './src/panel.js',     // NEW: DevTools panel script entry
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
                { from: 'src/manifest.json', to: 'manifest.json' },
                { from: 'public/icons', to: 'icons' },
                { from: 'src/devtools.html', to: 'devtools.html' },
                { from: 'src/panel.html', to: 'panel.html' },
            ],
        }),
    ],
    devtool: 'cheap-module-source-map',
};