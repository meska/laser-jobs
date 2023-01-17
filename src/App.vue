<template>
    <v-app>
        <v-main>
            <router-view/>
        </v-main>
    </v-app>
</template>

<script>
    
    
    export default {
        name: 'App',
        
        components: {},
        
        data: () => ({
            //
        }),
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