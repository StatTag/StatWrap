const path = require('path');

module.exports = {
    mode: 'development',
    target: 'electron-main', // Ensures compatibility with Node.js
    entry: './app/preload.js',
    output: {
        path: path.resolve(__dirname, '..', 'app/dist'),
        filename: 'preload.js'
    }
};
