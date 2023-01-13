<template>
    <div>
        <v-app-bar
            app
            color="primary"
            dark
        >
            <div class="d-flex align-center">
                <h1 class="text-h5 mb-0">LaserJobs - {{ this.$route.params.db }}</h1>
            </div>
            
            <v-spacer></v-spacer>
        </v-app-bar>
        <v-data-iterator
            :items="jobs"
            :search.sync="search"
            :items-per-page="50"
            :sort-by="sort.by"
            :sort-desc="sort.desc"
            :loading="loading"
            ref="tabela"
            :footer-props="{
                'items-per-page-options': [50,100,500]
            }"
        >
            <template v-slot:header>
                <v-toolbar
                    class="mb-1"
                >
                    <v-row align="center">
                        <v-col>
                            <v-text-field
                                v-model="search"
                                clearable
                                flat
                                hide-details
                                prepend-inner-icon="mdi-magnify"
                                label="Filtra"
                            ></v-text-field>
                        </v-col>
                    </v-row>
                </v-toolbar>
            </template>
            <template v-slot:default="props">
                <v-simple-table>
                    <template v-slot:default>
                        <thead>
                        <tr class="caption text-uppercase">
                            <th scope="col">
                                Colore
                            </th>
                            <th scope="col">
                                Codice
                            </th>
                            <th scope="col">
                                Descrizione
                            </th>
                            <th scope="col">
                                Fatto
                            </th>
                            <th scope="col" width="1%" colspan="2">
                                Aggiornato
                            </th>
                        
                        </tr>
                        </thead>
                        <tbody id="jobsTable">
                        <tr v-for="item in props.items" v-bind:key="item.id" :data-id="item.id">
                            <td width="1%">
                                <v-icon large :color="item.doc.color.hexa">mdi-checkbox-blank-circle</v-icon>
                            </td>
                            <td class="text-h4" width="30%">
                                {{ item.doc.codice }}
                            </td>
                            
                            <td class="text-h4">
                                {{ item.doc.descrizione }}
                            
                            </td>
                            <td width="1%">
                                <v-checkbox
                                    v-model="item.doc.done"
                                    dense
                                    flat
                                    hide-details
                                    outlined
                                    placeholder="Fatto"
                                    single-line
                                    type="text"
                                    @change="save(item)"
                                ></v-checkbox>
                            <td width="1%" class="text-no-wrap">
                                {{ item.doc.date | moment('LLL') }}
                            </td>
                        </tr>
                        </tbody>
                    </template>
                </v-simple-table>
            </template>
        
        </v-data-iterator>
    
    
    </div>
</template>

<script>
    import PouchDB from "pouchdb";
    import _ from "lodash";
    import Sortable from 'sortablejs';
    
    export default {
        components: {},
        name: "LaserJobs",
        data() {
            return {
                db: undefined,
                jobs: undefined,
                search: '',
                sort: {
                    desc: false,
                    by: 'doc.ordinamento',
                },
                loading: true,
                sortable: undefined,
                sortable_timer: undefined,
            }
        },
        created() {
            this.db = new PouchDB(`${this.$dbUrl}laserjobs_${this.$route.params.db}`)
        },
        mounted() {
            console.log("Ciaone");
            this.loading = true;
            this.db.allDocs({include_docs: true, descending: true}, (err, doc) => {
                this.jobs = doc.rows;
                this.loading = false;
            });
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
        },
        destroyed() {
            clearInterval(this.sortable_timer);
        },
        methods: {
            save: _.debounce(
                function (item) {
                    item.doc.date = new Date();
                    if (item.doc.done === true) {
                        item.doc.ordinamento = 1000 + item.doc.ordinamento;
                    } else {
                        item.doc.ordinamento = item.doc.ordinamento - 1000;
                    }
                    this.db.put(item.doc);
                },
            ),
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
                // console.log(this.sortable.toArray());
            },
            async getJobs() {
                this.jobs = await this.db.allDocs({include_docs: true});
            },
            newjob() {
                this.db.post({
                    codice: "",
                    descrizione: "",
                    ordinamento: -1,
                    date: new Date(),
                });
            },
            deleteJob(job) {
                this.db.remove(job.doc);
            },
            updateJob(job) {
                job.doc.codice = "Ciao New";
                job.doc.date = new Date()
                this.db.put(job.doc);
            }
            
        }
    }
</script>

<style scoped>
.sort-handle {
    cursor: move; /* fallback if grab cursor is unsupported */
    cursor: grab;
    cursor: -moz-grab;
    cursor: -webkit-grab;
}

/* (Optional) Apply a "closed-hand" cursor during drag operation. */
.sort-handle:active {
    cursor: grabbing;
    cursor: -moz-grabbing;
    cursor: -webkit-grabbing;
}
</style>