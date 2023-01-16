/* eslint-disable no-undef */
// noinspection JSUnresolvedFunction
const {defineConfig} = require('@vue/cli-service')
const webpack = require("webpack");
const fs = require("fs");
const packageJson = fs.readFileSync('./package.json')
const version = JSON.parse(packageJson).version || 0
module.exports = defineConfig({
    transpileDependencies: [
        'vuetify'
    ],
    configureWebpack: {
        plugins: [
            new webpack.DefinePlugin({
                'process.env': {
                    VUE_APP_PACKAGE_VERSION: '"' + version + '"'
                }
            }),
        ]
    },
    pluginOptions: {
        moment: {
            locales: [
                'it',
                'en'
            ]
        }
    }
})
