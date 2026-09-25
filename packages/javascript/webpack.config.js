const path = require('path');

const babelRule = {
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
};

module.exports = [
    {
        name: 'server',
        target: 'node',
        entry: path.resolve(__dirname, 'src', 'server', 'index.ts'),
        module: {
            rules: [babelRule],
        },
        resolve: {
            extensions: ['.ts'],
        },
        output: {
            filename: 'index.js',
            path: path.resolve(__dirname, 'dist', 'server'),
            libraryTarget: 'commonjs2'
        },
        externals: {
            'uuid': 'commonjs uuid',
            'ws': 'commonjs ws',

            'http': 'commonjs http',
            'path': 'commonjs path',
            'events': 'commonjs events',
        },
        mode: 'production',
    },
    {
        name: 'client',
        target: 'web',
        entry: path.resolve(__dirname, 'src', 'client', 'index.ts'),
        module: {
            rules: [babelRule],
        },
        resolve: {
            extensions: ['.ts'],
        },
        output: {
            filename: 'index.js',
            path: path.resolve(__dirname, 'dist', 'client'),
            libraryTarget: 'commonjs2'
        },
        externals: {
            'ws': 'commonjs ws',
        },
        mode: 'production',
    },
];
