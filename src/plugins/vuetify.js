import Vue from 'vue';
import Vuetify from 'vuetify/lib/framework';
import VuetifyToast from 'vuetify-toast-snackbar-ng';
import it from 'vuetify/es5/locale/it';
import en from 'vuetify/es5/locale/en';
import '@mdi/font/css/materialdesignicons.css'
import '@/assets/roboto.css'


Vue.use(Vuetify, {
    components: {
        VSnackbar: () => import('vuetify/lib/components/VSnackbar'),
        VBtn: () => import('vuetify/lib/components/VBtn'),
        VIcon: () => import('vuetify/lib/components/VIcon'),
    }
});
Vue.use(VuetifyToast);
export default new Vuetify(
    {
        lang: {
            locales: {it, en},
            current: 'it',
        }, icons: {
            defaultSet: 'mdi',
            iconfont: 'mdi', // default - only for display purposes
        },
    });
