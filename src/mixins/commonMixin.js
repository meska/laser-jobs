import PouchDB from 'pouchdb'
import _ from 'lodash'
import Sortable from 'sortablejs'
import {
    buildAuthenticatedDbUrl,
    buildDbEndpoint,
    clearDbSettings,
    clearSessionCookie,
    getDbSettings,
    getSessionCookie,
} from '@/utils/auth'

export let commonMixin = {
    data: () => ({
        loading: true,
        sortable: undefined,
        sortable_timer: undefined,
        loginPopUp: false,
        db: undefined,
        dbs: undefined,
        dblist: undefined,
        sync: undefined,
        jobs: undefined,
        update: undefined,
        username: '',
        password: '',
        dbSettings: {},
        connectionStatus: false,
        search: '',
        authUser: null,
        sort: {
            desc: false,
            by: 'doc.ordinamento',
        },
    }),
    mounted() {
        this.init()
    },
    computed: {
        filteredJobs() {
            let jobs = this.jobs
            if (this.search) {
                jobs = _.filter(jobs, (job) => {
                    return job.doc.descrizione.toLowerCase().includes(this.search.toLowerCase()) ||
                        job.doc.codice.toLowerCase().includes(this.search.toLowerCase())
                })
            }
            return jobs
        },
        filteredJobsReadonly() {
            let jobs = this.jobs
            jobs = _.filter(jobs, (job) => {
                return (job.doc.descrizione !== '') || (job.doc.codice !== '')
            })
            if (this.search) {
                jobs = _.filter(jobs, (job) => {
                    return job.doc.descrizione.toLowerCase().includes(this.search.toLowerCase()) ||
                        job.doc.codice.toLowerCase().includes(this.search.toLowerCase())
                })
            }
            return jobs.filter((job) => !job.doc.deleted)
        },
    },
    methods: {
        getInCorsoJobs() {
            return (this.jobs || []).filter((job) => job && job.doc && job.doc.in_corso)
        },
        async enforceSingleInCorso(preferredId = null) {
            const inCorsoJobs = this.getInCorsoJobs()
            if (inCorsoJobs.length <= 1) {
                return
            }

            let keeper = null
            if (preferredId) {
                keeper = inCorsoJobs.find((job) => job.id === preferredId)
            }
            if (!keeper) {
                keeper = _.orderBy(
                    inCorsoJobs,
                    [(job) => new Date(job.doc.date || 0).getTime()],
                    ['desc'],
                )[0]
            }

            const docsToSave = inCorsoJobs
                .filter((job) => job.id !== keeper.id)
                .map((job) => {
                    job.doc.in_corso = false
                    job.doc.date = new Date()
                    return job.doc
                })

            if (docsToSave.length) {
                await Promise.all(docsToSave.map((doc) => this.db.put(doc)))
            }
        },
        async logout() {
            clearSessionCookie()
            await clearDbSettings()
            window.location.href = '/login'
        },
        login() {
            this.logout()
        },
        async init() {
            let app = this
            app.loading = true

            try {
                app.dbSettings = await getDbSettings()
                app.authUser = getSessionCookie()

                if (!app.authUser) {
                    app.connectionStatus = false
                    app.$router.replace('/login')
                    return
                }
                if (!app.dbSettings) {
                    app.connectionStatus = false
                    app.$router.replace('/login')
                    return
                }

                const targetDb = app.authUser.azienda
                const isEditRoute = app.$route.name === 'LaserJobsEdit'
                const targetPath = isEditRoute ? `/${targetDb}/edit` : `/${targetDb}`

                if (app.$route.params.db !== targetDb) {
                    app.$router.replace(targetPath)
                    return
                }

                const authUrl = buildAuthenticatedDbUrl(app.$dbUrl, app.dbSettings)

                this.db = new PouchDB(targetDb)
                this.sync = PouchDB.sync(targetDb, buildDbEndpoint(authUrl, targetDb), {
                    live: true,
                    retry: true,
                }).on('denied', function (err) {
                    if (err && (err.status === 401 || err.status === 403)) {
                        app.connectionStatus = false
                        app.logout()
                    }
                }).on('error', function (err) {
                    if (err && (err.status === 401 || err.status === 403)) {
                        app.connectionStatus = false
                        app.logout()
                    }
                })

                this.db.allDocs({ include_docs: true, descending: true, deleted: 'ok' }, (err, doc) => {
                    if (err && (err.status === 401 || err.status === 403)) {
                        app.connectionStatus = false
                        app.logout()
                    } else {
                        app.jobs = doc.rows
                        app.loading = false
                        app.connectionStatus = true
                        app.enforceSingleInCorso()
                        app.enableSync()
                    }
                })
            } catch (e) {
                console.log(e)
                app.loading = false
                app.connectionStatus = false
            }
        },
        enableSync() {
            let app = this
            this.db.changes({
                since: 'now',
                live: true,
                include_docs: true,
            }).on('change', function (change) {
                if (change.deleted) {
                    app.jobs = app.jobs.filter((job) => {
                        return job.doc._id !== change.id
                    })
                } else {
                    let existing = _.find(app.jobs, (job) => {
                        return job.doc._id === change.id
                    })
                    if (existing) {
                        existing.doc = change.doc
                    } else {
                        app.jobs.push(change)
                    }
                }
            }).on('error', function (err) {
                console.log(err)
            })
            app.sortable_timer = setInterval(this.setupSortable, 50)
        },
        setupSortable() {
            let app = this
            let el = document.getElementById('jobsTable')
            if (el) {
                clearInterval(app.sortable_timer)
                app.sortable = new Sortable(el, {
                    animation: 150,
                    onUpdate: app.updateSort,
                    handle: '.sort-handle',
                })
            }
        },
        updateSort() {
            _.forEach(this.sortable.toArray(), (id, index) => {
                let job = _.find(this.jobs, (job) => {
                    return job.id === id
                })
                job.doc.ordinamento = index
                this.db.put(job.doc)
            })
        },
    },
    destroyed() {
        clearInterval(this.sortable_timer)
        if (this.sync && this.sync.cancel) {
            this.sync.cancel()
        }
        if (this.db) {
            this.db.close()
        }
        if (this.dblist) {
            this.dblist.close()
        }
    },
}
