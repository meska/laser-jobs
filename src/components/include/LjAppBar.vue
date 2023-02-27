<template>
    <v-app-bar
        app
        color="primary"
        dark
    >
        <v-row class="align-center">
            <div class="d-flex align-center">
                <h1 class="text-h5 mb-0">LaserJobs - {{ this.$route.params.db }}</h1>
            </div>
            <v-spacer></v-spacer>
            <span class="caption">Ver. {{ $AppVersion }}</span>
            <v-spacer></v-spacer>
            <v-btn icon @click="logout()" v-if="username">
                <v-icon>mdi-logout</v-icon>
            </v-btn>
            <v-col v-if="dbs">
                <v-autocomplete
                    dense
                    v-model="curDb"
                    :search-input.sync="dbSearch"
                    :items="dbs"
                    label="Seleziona Lista"
                    item-text="key"
                    item-value="key"
                    @change="changeDb()"
                >
                    <template v-slot:no-data>
                        <v-btn small color="green" class="ml-2" @click="newDb(dbSearch)">Aggiungi: {{ dbSearch }} ?
                        </v-btn>
                    </template>
                </v-autocomplete>
            </v-col>
        </v-row>
    </v-app-bar>
</template>
<script>
    export default {
        name: 'LjAppBar',
        data: () => ({
            username: undefined,
            curDb: undefined,
            dbSearch: undefined,
        }),
        props: {
            value: {},
            dbs: {},
        },
        methods: {
            logout() {
                this.$store.dispatch('logout');
            },
            changeDb() {
                this.$router.push(`/${this.curDb}/edit`);
                window.location.reload();
            },
            newDb(dbSearch) {
                this.$router.push(`/${dbSearch}/edit`);
                window.location.reload();
            }
        },
    }
</script>
