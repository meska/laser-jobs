<template>
    <v-btn text plain small @click="sortMe()" :color="sort.by === field ? 'info':''">{{ label }}
        <template v-if="sort.by === field">
            <v-icon v-if="sort.desc">mdi-chevron-down</v-icon>
            <v-icon v-else>mdi-chevron-up</v-icon>
        </template>
    </v-btn>
</template>
<script>
    export default {
        name: 'BtSort',
        props: {
            label: {
                type: String,
                required: true
            },
            field: {
                type: String,
                required: true
            },
            value: {},
        },
        computed: {
            sort: {
                get() {
                    return this.value
                },
                set(value) {
                    this.$emit('input', value)
                }
            },
        },
        methods: {
            sortMe() {
                this.sort = {
                    by: this.field.toLowerCase(),
                    desc: !this.sort.desc
                }
            }
        }
    }
</script>
