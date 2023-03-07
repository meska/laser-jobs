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
            <lj-settings :connection-status="connectionStatus"/>
        </v-app-bar>
        <v-row v-if="dbs" class="mr-auto ml-auto mt-2 flex-column">
            <v-col v-for="(item,id) in dbs" v-bind:key="id" class="flex-grow-1 flex-shrink-0">
                <v-btn :to="`/${item.key}/`">{{ item.key }}</v-btn>
            </v-col>
        </v-row>
    </div>
</template>

<script>

    import LjSettings from "@/components/include/LjSettings.vue";
    import {commonMixin} from "@/mixins/commonMixin";
    
    
    export default {
        mixins: [commonMixin],
        components: {LjSettings},
        name: "ChooseDb",
        methods: {
        }
    }
</script>

<style scoped>

</style>