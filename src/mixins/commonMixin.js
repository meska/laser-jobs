import PouchDB from "pouchdb";
import _ from "lodash";
import Sortable from "sortablejs";

export let commonMixin = {
    data: () => ({
        loading: true,
        sortable: undefined,
        sortable_timer: undefined,
        loginPopUp: false,
        username: '',
        password: '',
        db: undefined,
        dbs: undefined,
        dblist: undefined,
        sync: undefined,
        jobs: undefined,
        update: undefined,
        search: '',
        sort: {
            desc: false,
            by: 'doc.ordinamento',
        },
    }),
    mounted() {
        this.username = 'couchdb'
        this.password = 'couchdb'
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
        this.init()
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
            let urlparts = app.$dbUrl.split('//')
            let url = urlparts[0] + '//' + `${app.username}` + ':' + app.password + '@' + urlparts[1]
            this.db = new PouchDB(app.$route.params.db);

            localStorage.setItem('defaultDb', app.$route.params.db)

            this.dblist = new PouchDB('dblist');
            this.dblist.put({'_id': app.$route.params.db, 'url': app.$dbUrl})
            this.dblist.sync(`${url}dblist`, {live: true, retry: true})

            this.sync = PouchDB.sync(app.$route.params.db, `${url}laserjobs_${app.$route.params.db}`, {
                live: true,
                retry: true
            }).on('denied', function (err) {
                if ((err) && ((err.status === 401) || (err.status === 403))) {
                    app.loginPopUp = true;
                }
            }).on('error', function (err) {
                if ((err) && ((err.status === 401) || (err.status === 403))) {
                    app.loginPopUp = true;
                }
            });

            this.db.allDocs({include_docs: true, descending: true, deleted: 'ok'}, (err, doc) => {
                if ((err) && ((err.status === 401) || (err.status === 403))) {
                    app.loginPopUp = true;
                } else {
                    app.jobs = doc.rows;
                    app.loading = false;
                    app.init2();
                }
            });
            this.dblist.allDocs({include_docs: true, descending: true, deleted: 'ok'}, (err, doc) => {
                if ((err) && ((err.status === 401) || (err.status === 403))) {
                    app.loginPopUp = true;
                } else {
                    app.dbs = doc.rows;
                }
            });
        },
        init2: function () {
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
        this.db.close()
        this.dblist.close()
    },
}