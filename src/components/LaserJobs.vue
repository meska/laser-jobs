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
    
    import _ from "lodash";
    
    import {commonMixin} from "@/mixins/commonMixin";
    
    export default {
        mixins: [commonMixin],
        components: {},
        name: "LaserJobs",
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
        }
    }
</script>

<style scoped>

</style>