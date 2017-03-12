const path = require('path');
const webpack = require('webpack'); 

const Visualizer = require('webpack-visualizer-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
    devtool: 'source-map',
    entry: {
        client: path.resolve(__dirname, './app/client/client.tsx')
    },
    output: {
        filename: '[name]-bundle.js',
        path: './dist/public/',
        pathinfo: true,
    },
    resolve: {
        extensions: ['.ts', '.js', '.tsx']
    },   
    module: {
      rules: [
        {
            test: /\.(png|ttf|eot|svg|woff(2)?)(\?[a-z0-9=&.]+)?$/,
            loader : 'file-loader'
        },
        { 
          test: /\.tsx?$/, 
          loader: 'ts-loader', 
          options: {
            configFileName: './app/tsconfig.json',
            logInfoToStdOut: true
          }, 
          exclude: [/node_modules/]
        },
        {
            test: /\.css$/,
            use: ExtractTextPlugin.extract({
               use: 'css-loader'
            })
        }
      ]
    },
    plugins: [
      new ExtractTextPlugin('styles.css'),
          //new webpack.optimize.UglifyJsPlugin(),
          new Visualizer({
             filename: './statistics.html'
           })        
    ]
};
