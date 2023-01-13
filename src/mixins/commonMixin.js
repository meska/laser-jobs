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
        jobs: undefined,
        search: '',
        sort: {
            desc: false,
            by: 'doc.ordinamento',
        },
    }),
    created() {
        this.$vlf.getItem('auth').then(auth => {
            if (auth) {
                this.username = auth.username
                this.password = auth.password
                this.init()
            } else {
                this.loginPopUp = true;
            }
        });
    },
    methods: {
        logout: function () {
            this.$vlf.removeItem('auth').then(() => {
                window.location.reload();
            });
        },
        init: function () {
            this.loading = true;
            let urlparts = this.$dbUrl.split('//')
            let url = urlparts[0] + '//' + `${this.$route.params.db}.${this.username}` + ':' + this.password + '@' + urlparts[1]
            this.db = new PouchDB(`${url}laserjobs_${this.$route.params.db}`);
            this.db.allDocs({include_docs: true, descending: true}, (err, doc) => {
                if ((err) && ((err.status === 401) || (err.status === 403))) {
                    this.loginPopUp = true;
                } else {
                    this.jobs = doc.rows;
                    this.loading = false;
                    this.init2();
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
                    // disabled: !app.cansort,
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
    },
}