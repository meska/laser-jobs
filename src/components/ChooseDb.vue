<template>
    <div>
        <v-app-bar
            app
            color="primary"
            dark
        >
            <div class="d-flex align-center">
                <h1 class="text-h5 mb-0">LaserJobs - Seleziona una tabella</h1>
            </div>
            <v-spacer></v-spacer>
            <span class="caption">Ver. {{ $AppVersion }}</span>
            <v-btn icon @click="logout()" v-if="username">
                <v-icon>mdi-logout</v-icon>
            </v-btn>
        </v-app-bar>
    <v-row v-if="dbs" class="mr-auto ml-auto mt-2">
        <v-col v-for="(item,id) in dbs" v-bind:key="id">
            <v-btn :to="`/laser/${item.key}/`">{{item.key}}</v-btn>
        </v-col>
    </v-row>
    </div>
</template>

<script>
    
    import _ from "lodash";
    import PouchDB from "pouchdb";
    // import PouchDB from "pouchdb";
    
    
    export default {
        components: {},
        name: "ChooseDb",
        data: () => ({
            dbs: [],
            dbList: undefined,
            username: undefined,
            loading: false,
        }),
        mounted() {
            let app = this;
            let urlparts = app.$dbUrl.split('//')
            let url = urlparts[0] + '//couchdb:couchdb@' + urlparts[1]
            
            // get list of databases from the server with fetch
            
            this.dbList = new PouchDB('dblist');
            this.dbList.sync(`${url}dblist`, {live: true, retry: true});
            this.dbList.allDocs({include_docs: true, descending: true}, (err, doc) => {
                if ((err) && ((err.status === 401) || (err.status === 403))) {
                    app.loginPopUp = true;
                } else {
                    app.dbs = doc.rows;
                    app.loading = false;
                }
            });
        },
        destroyed() {
            this.dbList.close();
        },
        methods: {
            save: _.debounce(
                function (item) {
                    item.doc.date = new Date();
                    /*
                    if (item.doc.done === true) {
                        item.doc.ordinamento = 1000 + item.doc.ordinamento;
                    } else {
                        item.doc.ordinamento = item.doc.ordinamento - 1000;
                    }
                     */
                    this.db.put(item.doc);
                },
            ),
        }
    }
</script>

<style scoped>

</style>