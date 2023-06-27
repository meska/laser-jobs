import PouchDB from "pouchdb";
import _ from "lodash";
import Sortable from "sortablejs";

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
        username: '', /* deprecated */
        password: '',/* deprecated */
        dbSettings: {},
        connectionStatus: false,
        search: '',
        sort: {
            desc: false,
            by: 'doc.ordinamento',
        },
    }),
    mounted() {
        this.$vlf.getItem('dbSettings').then(dbSettings => {
            if (dbSettings && dbSettings !== null) {
                this.dbSettings = dbSettings
                this.init()
            } else {
                this.connectionStatus = false;
            }
        })
        /*
        this.$vlf.getItem('auth').then(auth => {
            if (auth) {
                this.username = auth.username
                this.password = auth.password
                this.init()
            } else {
                this.loginPopUp = true;
            }
        });
        */
    },
    computed: {
        filteredJobs() {
            let jobs = this.jobs
            if (this.search) {
                jobs = _.filter(jobs, (job) => {
                    return (job.doc.descrizione.toLowerCase().includes(this.search.toLowerCase()) || (job.doc.codice.toLowerCase().includes(this.search.toLowerCase())))
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
                    return (job.doc.descrizione.toLowerCase().includes(this.search.toLowerCase()) || (job.doc.codice.toLowerCase().includes(this.search.toLowerCase())))
                })
            }
            return jobs.filter((job) => !job.doc.deleted);
        },
    },
    methods: {

        logout: function () {
            this.$vlf.removeItem('auth').then(() => {
                window.location.reload();
            });
        },
        init: function () {
            let app = this;
            app.loading = true;
            try {
                let urlparts = app.$dbUrl.split('//')
                let url = urlparts[0] + '//' + `${app.dbSettings.serverLogin}` + ':' + app.dbSettings.serverPassword + '@' + urlparts[1]


                if (!app.$route.params.db) {
                    let defaultDb = localStorage.getItem('defaultDb');
                    if (defaultDb) {
                        app.$router.push(`/${defaultDb}`);
                    } else {
                        app.$router.push(`/laser`);
                    }
                }

                //localStorage.setItem('defaultDb', app.$route.params.db)

                this.dblist = new PouchDB('dblist');
                this.dblist.put({'_id': app.$route.params.db, 'url': app.$dbUrl})
                this.dblist.sync(`${url}dblist`, {live: true, retry: true}).on('denied', function (err) {
                    if ((err) && ((err.status === 401) || (err.status === 403))) {
                        app.connectionStatus = false;
                    }
                }).on('error', function (err) {
                    if ((err) && ((err.status === 401) || (err.status === 403))) {
                        // login non valido
                        this.$store.dispatch('loginPopup', true);
                        app.connectionStatus = false;
                    }
                });

                this.dblist.allDocs({include_docs: true, descending: true}, (err, doc) => {
                    if ((err) && ((err.status === 401) || (err.status === 403))) {
                        app.connectionStatus = false;
                    } else {
                        app.dbs = doc.rows;
                        app.loading = false;
                        this.connectionStatus = true;
                    }
                });
                if (app.$route.params.db) {
                    this.db = new PouchDB(app.$route.params.db);
                    this.sync = PouchDB.sync(app.$route.params.db, `${url}${app.$route.params.db}`, {
                        live: true,
                        retry: true
                    }).on('denied', function (err) {
                        if ((err) && ((err.status === 401) || (err.status === 403))) {
                            app.connectionStatus = false;
                        }
                    }).on('error', function (err) {
                        if ((err) && ((err.status === 401) || (err.status === 403))) {
                            app.connectionStatus = false;
                        }
                    });

                    this.db.allDocs({include_docs: true, descending: true, deleted: 'ok'}, (err, doc) => {
                        if ((err) && ((err.status === 401) || (err.status === 403))) {
                            app.connectionStatus = false;
                        } else {
                            app.jobs = doc.rows;
                            app.loading = false;
                            this.connectionStatus = true;
                            app.enableSync();
                        }
                    });
                }
            } catch (e) {
                console.log(e);
            }
        },
        enableSync: function () {
            let app = this;
            this.db.changes({
                since: 'now',
                live: true,
                include_docs: true
            }).on('change', function (change) {
                // change.id contains the doc id, change.doc contains the doc
                if (change.deleted) {
                    // document was deleted
                    app.jobs = app.jobs.filter((job) => {
                        return job.doc._id !== change.id;
                    });
                } else {
                    // document was added/modified
                    let existing = _.find(app.jobs, (job) => {
                        return job.doc._id === change.id;
                    })
                    if (existing) {
                        existing.doc = change.doc;
                    } else {
                        app.jobs.push(change);
                    }
                }
            }).on('error', function (err) {
                // handle errors
                console.log(err);
            });
            app.sortable_timer = setInterval(this.setupSortable, 50)
        },
        login: function () {
            this.$vlf.setItem('auth', {
                username: this.username,
                password: this.password
            }).then(() => {
                this.loginPopUp = false;
                this.init();
            });
        },
        setupSortable: function () {
            let app = this
            let el = document.getElementById('jobsTable');
            if (el) {
                clearInterval(app.sortable_timer)
                app.sortable = new Sortable(el, {
                    animation: 150,
                    onUpdate: app.updateSort,
                    handle: ".sort-handle",
                })
            }
        },
        updateSort: function () {
            _.forEach(this.sortable.toArray(), (id, index) => {
                let job = _.find(this.jobs, (job) => {
                    return job.id === id;
                })
                job.doc.ordinamento = index;
                this.db.put(job.doc);
            })
        },
    }, destroyed() {
        clearInterval(this.sortable_timer);
        if (this.db) {
            this.db.close()
        }
        this.dblist.close()
    },
}