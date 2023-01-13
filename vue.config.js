const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: [
    'vuetify'
  ],

  pluginOptions: {
    moment: {
      locales: [
        'it',
        'en'
      ]
    }
  }
})
