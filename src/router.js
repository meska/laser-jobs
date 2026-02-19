import Vue from 'vue'
import Router from 'vue-router'
import { getDefaultRouteForSession, getSessionCookie } from '@/utils/auth'

const Login = () => import('./components/Login')
const LaserJobs = () => import('./components/LaserJobs')
const LaserJobsEdit = () => import('./components/LaserJobsEdit')
const ChooseDb = () => import('./components/ChooseDb')
const NotFound = () => import('./components/NotFound')

const originalPush = Router.prototype.push
Router.prototype.push = function push(location) {
    return originalPush.call(this, location).catch((err) => err)
}

Vue.use(Router)

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: Login,
    },
    {
        path: '/',
        name: 'Home',
        component: ChooseDb,
    },
    {
        path: '/:db',
        name: 'LaserJobs',
        component: LaserJobs,
    },
    {
        path: '/:db/edit',
        name: 'LaserJobsEdit',
        component: LaserJobsEdit,
    },
    { path: '*', component: NotFound },
]

const router = new Router({ routes, mode: 'history' })

router.beforeEach((to, from, next) => {
    const session = getSessionCookie()

    if (to.name === 'Login') {
        if (session) {
            return next(getDefaultRouteForSession(session))
        }
        return next()
    }

    if (!session) {
        return next({ name: 'Login' })
    }

    if (to.name === 'Home') {
        return next(getDefaultRouteForSession(session))
    }

    if (to.name === 'LaserJobsEdit' && session.livello !== 'editor') {
        return next(`/${session.azienda}`)
    }

    if ((to.name === 'LaserJobs' || to.name === 'LaserJobsEdit') && to.params.db !== session.azienda) {
        return next(getDefaultRouteForSession(session))
    }

    return next()
})

export default router
