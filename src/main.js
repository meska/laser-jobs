/* eslint-disable no-undef */
import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import VueMoment from 'vue-moment'
import router from "./router";
Vue.config.productionTip = false
const moment = require('moment')
const momentDurationFormatSetup = require("moment-duration-format")
momentDurationFormatSetup(moment)
require('moment/locale/it')


Vue.prototype.$dbUrl = process.env.VUE_APP_DB_URL

Vue.use(VueMoment, {moment});

new Vue({
  vuetify,
  router,
  render: h => h(App)
}).$mount('#app')
