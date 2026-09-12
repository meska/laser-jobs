/* eslint-disable no-undef */
import Vue from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import vuetify from './plugins/vuetify'
import VueMoment from 'vue-moment'
import router from "./router";
import Vlf from 'vlf'
import localforage from "localforage";
import * as Sentry from "@sentry/vue";
const pinia = createPinia()
Vue.config.productionTip = false
const moment = require('moment')
const momentDurationFormatSetup = require("moment-duration-format")
momentDurationFormatSetup(moment)
require('moment/locale/it')

// Variabili Globali da ENV

Vue.prototype.$dbUrl = process.env.VUE_APP_DB_URL
console.log("db", Vue.prototype.$dbUrl)
Vue.prototype.$AppVersion = process.env.VUE_APP_PACKAGE_VERSION

// El monitoraggio parte solo quando il build riceve il DSN, cussì in dev no femo rumor.
const sentryDsn = process.env.VUE_APP_SENTRY_DSN
if (sentryDsn) {
    Sentry.init({
        Vue,
        dsn: sentryDsn,
        environment: process.env.NODE_ENV,
        release: `laserjobs@${process.env.VUE_APP_PACKAGE_VERSION}`,
        logErrors: true,
    })
}

Vue.use(VueMoment, {moment});
Vue.use(Vlf, localforage);
Vue.use(pinia)
new Vue({
    vuetify,
    router,
    render: h => h(App)
}).$mount('#app')
