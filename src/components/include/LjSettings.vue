<template>
    <div>
        <v-btn icon @click="settingsPopUp = true">
            <v-icon>mdi-cog-box</v-icon>
        </v-btn>
        <v-dialog v-model="settingsPopUp" width="60vw">
            <v-card>
                <v-card-title>
                    Accesso
                </v-card-title>
                <v-card-text>
                    <v-text-field
                        v-model="dbSettings.serverLogin"
                        label="Login"
                        outlined
                    ></v-text-field>
                    <v-text-field
                        v-model="dbSettings.serverPassword"
                        label="Password"
                        outlined
                    ></v-text-field>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn @click="settingsPopUp = false" color="blue">Annulla</v-btn>
                    <v-btn @click="save()" color="green">Salva</v-btn>
                </v-card-actions>
            
            </v-card>
        </v-dialog>
    </div>
</template>
<script>
    export default {
        name: 'LjSettings',
        props: {
            connectionStatus: {
                type: Boolean,
                required: true
            },
        },
        data() {
            return {
                settingsPopUp: false,
                dbSettings: {
                    serverLogin: '',
                    serverPassword: ''
                },
            }
        },
        mounted() {
            this.$vlf.getItem('dbSettings').then(dbSettings => {
                if (dbSettings && dbSettings !== null) {
                    this.dbSettings = dbSettings
                } else {
                    this.$vlf.setItem('dbSettings', this.dbSettings);
                    window.location.reload();
                }
            })
        },
        methods: {
            save() {
                this.$vlf.setItem('dbSettings', this.dbSettings);
                this.settingsPopUp = false;
                window.location.reload();
            }
        }
    }
</script>