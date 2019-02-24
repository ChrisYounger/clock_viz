var webpack = require('webpack');
var path = require('path');

module.exports = {
    entry: 'visualization_source',
    module: {
        loaders: [
            {include: /\.json$/, loaders: ["json-loader"]}
        ]
    },    
    resolve: {
        extensions: ['', '.json', '.jsx', '.js'],
        root: [
            path.join(__dirname, 'src'),
        ]
    },
    output: {
        filename: 'visualization.js',
        libraryTarget: 'amd'
    },
    externals: [
        'api/SplunkVisualizationBase',
        'api/SplunkVisualizationUtils'
    ],
};