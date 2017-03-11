const path = require('path');
const webpack = require('webpack'); 

const Visualizer = require('webpack-visualizer-plugin');

module.exports = {
    devtool: 'source-map',
    entry: {
        client: path.resolve(__dirname, './app/client/client.tsx')
        // server: path.resolve(__dirname, './app/server/Bootstrap.ts')
    },
    output: {
        filename: '[name]-bundle.js',
        path: './dist/',
        pathinfo: true,
        //devtoolModuleFilenameTemplate: '[absolute-resource-path]',
        //devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]'
    },
    resolve: {
        extensions: ['.ts', '.js', '.tsx']
    },   
    module: {
      rules: [
        { 
          test: /\.tsx?$/, 
          loader: 'ts-loader', 
          options: {
            configFileName: './app/tsconfig.json',
            logInfoToStdOut: true
          }, 
          exclude: [/node_modules/]
        }
      ]
    },
    plugins: [
          //new webpack.optimize.UglifyJsPlugin(),
          // new Visualizer({
          //   filename: './statistics.html'
          // })        
    ]
};
