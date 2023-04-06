const path = require('path');

module.exports = {
    entry: path.resolve(__dirname, 'src', 'index.ts'),
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,

                loader: 'babel-loader',

                options: {
                    plugins: [
                        [
                            '@babel/plugin-transform-typescript',
                            {
                                allowDeclareFields: true,
                            }
                        ]
                    ],
                    presets: [
                        '@babel/preset-typescript',
                        '@babel/preset-env',
                    ]
                }
            },
        ],
    },
    resolve: {
        extensions: ['.ts'],
    },
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'commonjs2'
    },
    externals: {

    },
    mode: 'production',
};