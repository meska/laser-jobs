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
    
    </div>
</template>

<script>
    
    import _ from "lodash";
    // import PouchDB from "pouchdb";
    
    
    export default {
        components: {},
        name: "ChooseDb",
        data: () => ({
            dbs: [],

            db: undefined,
        }),
        created() {
            let app = this;
            let urlparts = app.$dbUrl.split('//')
            let url = urlparts[0] + '//' + `${app.username}` + ':' + app.password + '@' + urlparts[1]
            
            // get list of databases from the server with fetch
            
            fetch(url + '/_all_dbs')
                .then(response => response.json())
                .then(dbs => {
                    app.dbs = dbs;
                });
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