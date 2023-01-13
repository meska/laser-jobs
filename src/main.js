/* eslint-disable no-undef */
import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import VueMoment from 'vue-moment'
import router from "./router";
import Vlf from 'vlf'
import localforage from "localforage";

Vue.config.productionTip = false
const moment = require('moment')
const momentDurationFormatSetup = require("moment-duration-format")
momentDurationFormatSetup(moment)
require('moment/locale/it')


Vue.prototype.$dbUrl = "https://laserjobsdb.onlinegest.it/"

Vue.use(VueMoment, {moment});
Vue.use(Vlf, localforage);
new Vue({
  vuetify,
  router,
  render: h => h(App)
}).$mount('#app')
