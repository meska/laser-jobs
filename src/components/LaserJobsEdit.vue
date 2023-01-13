<template>
    <div>
        <v-app-bar
            app
            color="primary"
            dark
        >
            <div class="d-flex align-center">
                <h1 class="text-h5 mb-0">LaserJobs - Edit - {{ this.$route.params.db }}</h1>
            </div>
            
            <v-spacer></v-spacer>
            <v-btn icon @click="logout">
                <v-icon>mdi-logout</v-icon>
            </v-btn>
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
                        <v-col class="flex-shrink-1 flex-grow-0">
                            <v-btn @click="newjob()" color="green">Aggiungi</v-btn>
                        </v-col>
                    </v-row>
                </v-toolbar>
            </template>
            <template v-slot:default="props">
                <v-simple-table>
                    <template v-slot:default>
                        <thead>
                        <tr class="caption text-uppercase">
                            <th scope="col" width="30px">
                                <bt-sort v-model="sort" label="Sort" field="doc.ordinamento"/>
                            </th>
                            <th scope="col">
                                Colore
                            </th>
                            <th scope="col">
                                <bt-sort v-model="sort" label="Codice" field="doc.codice"/>
                            </th>
                            <th scope="col">
                                <bt-sort v-model="sort" label="Descrizione" field="doc.descrizione"/>
                            </th>
                            <th scope="col">
                                <bt-sort v-model="sort" label="Fatto" field="doc.done"/>
                            </th>
                            <th scope="col" width="1%" colspan="2">
                            
                            </th>
                        
                        </tr>
                        </thead>
                        <tbody id="jobsTable">
                        <tr v-for="item in props.items" v-bind:key="item.id" :data-id="item.id">
                            <td class="sort-handle text-center" width="30px">
                                <v-icon>mdi-drag</v-icon>
                            </td>
                            <td>
                                <v-color-picker v-model="item.doc.color" hide-canvas hide-inputs
                                                @input="saveColor(item)"></v-color-picker>
                            </td>
                            <td class="mr-0 pr-0">
                                <v-text-field
                                    v-model="item.doc.codice"
                                    dense
                                    flat
                                    hide-details
                                    label="Codice"
                                    outlined
                                    placeholder="Codice"
                                    single-line
                                    type="text"
                                    @change="save(item)"
                                ></v-text-field>
                            
                            </td>
                            
                            <td>
                                <v-text-field
                                    v-model="item.doc.descrizione"
                                    dense
                                    flat
                                    hide-details
                                    label="Descrizione"
                                    outlined
                                    placeholder="Descrizione"
                                    single-line
                                    type="text"
                                    @change="save(item)"
                                ></v-text-field>
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
                            </td>
                            <td width="1%" class="text-no-wrap">
                                {{ item.doc.date | moment('LLL') }}
                            </td>
                            
                            <td width="1%">
                                <v-btn @click="deleteJob(item)" color="orange">
                                    <v-icon>mdi-delete</v-icon>
                                </v-btn>
                            </td>
                        
                        </tr>
                        </tbody>
                    </template>
                </v-simple-table>
            </template>
        
        </v-data-iterator>
        <v-dialog v-model="loginPopUp" width="40vw">
            <v-card>
                <v-card-title>
                    Login
                </v-card-title>
                <v-card-text>
                    <v-text-field
                        v-model="username"
                        label="Username"
                        outlined
                    ></v-text-field>
                    <v-text-field
                        v-model="password"
                        label="Password"
                        outlined
                        type="password"
                    ></v-text-field>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn @click="loginPopUp = false" color="blue">Cancel</v-btn>
                    <v-btn @click="login()" color="green">Login</v-btn>
                </v-card-actions>
            
            </v-card>
        </v-dialog>
    </div>
</template>

<script>
    import btSort from "@/components/include/BtSort";
    import _ from "lodash";
    import {commonMixin} from "@/mixins/commonMixin";
    
    export default {
        mixins: [commonMixin],
        computed: {},
        components: {
            btSort
        },
        name: "LaserJobsEdit",
        data() {
            return {}
        },
        methods: {
            save: _.debounce(
                function (item) {
                    item.doc.date = new Date();
                    this.db.put(item.doc);
                },
            ),
            saveColor: _.debounce(
                function (item) {
                    item.doc.date = new Date();
                    this.db.put(item.doc);
                },
            ),
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