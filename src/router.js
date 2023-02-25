import Vue from 'vue'
import Router from 'vue-router'
const LaserJobs = () => import("./components/LaserJobs")
const LaserJobsEdit = () => import("./components/LaserJobsEdit")
const ChooseDb = () => import("./components/ChooseDb")
const NotFound = () => import("./components/NotFound")

const originalPush = Router.prototype.push;
Router.prototype.push = function push(location) {
    return originalPush.call(this, location).catch(err => err)
};

Vue.use(Router);

const routes = [
    {
        path: '/',
        name: 'Home',
        component: ChooseDb,
    },
    {
        path: '/laser/:db',
        name: 'LaserJobs',
        component: LaserJobs,
    },
    {
        path: '/laser/:db/edit',
        name: 'LaserJobsEdit',
        component: LaserJobsEdit,
    },
    {path: '*', component: NotFound}
];
const router = new Router({routes, mode: 'history'});

export default router;