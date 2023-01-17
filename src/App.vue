<template>
    <v-app>
        <v-main>
            <router-view/>
        </v-main>
        <!-- SNACKBAR NUOVA RELEASE --->
        <v-snackbar
            v-model="reloadSnack"
            timeout="9000"
            absolute
            right
            bottom
            vertical
            color="info"
            class="mb-10 mr-5"
        >
            <v-row dense align="center">
                <v-col class="text-h6">
                    Nuova Versione disponibile
                </v-col>
                <v-col class="flex-shrink-1 flex-grow-0">
                    <v-btn color="success" class="ml-2" @click.stop="aggiorna()">aggiorna</v-btn>
                </v-col>
            </v-row>
        </v-snackbar>
    </v-app>
</template>

<script>
    
    
    export default {
        name: 'App',
        
        components: {},
        
        data: () => ({
            versiontimer: undefined,
            reloadSnack:undefined
        }),
        created() {
            if (this.versiontimer === undefined) {
                this.versiontimer = setInterval(this.checkVersion, 600 * 1000);
            }
            setTimeout(this.checkVersion, 1000)
        },
        destroyed() {
            clearInterval(this.versiontimer)
        },
        methods: {
            aggiorna() {
                window.location.reload();
            },
            checkVersion: async function () {
                // chec version of the app from package.json in the root of the project
                // and compare it with the version on github
                
                // get the version from package.json
                let version = this.$AppVersion
                
                // get the version from github
                let response = await fetch('https://raw.githubusercontent.com/meska/laser-jobs/main/package.json')
                let json = await response.json()
                let github_version = json.version
                
                if (version !== github_version) {
                   this.reloadSnack = true
                }
            },
        }
    };
</script>

<style>
.cFatto {
    background-color: rgba(0, 255, 37, 0.4);
}

.cFatto:hover {
    background-color: rgba(0, 255, 37, 0.60) !important;
}

.cSospeso {
    background-color: rgba(255, 144, 0, 0.40);
}

.cSospeso:hover {
    background-color: rgba(255, 144, 0, 0.60) !important;
}
</style>