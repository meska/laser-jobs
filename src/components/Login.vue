<template>
    <v-container class="fill-height" fluid>
        <v-row class="justify-center align-center fill-height">
            <v-col cols="12" sm="8" md="5" lg="4">
                <v-card>
                    <v-card-title class="text-h5">Accesso LaserJobs</v-card-title>
                    <v-card-text>
                        <v-alert v-if="error" type="error" dense>
                            {{ error }}
                        </v-alert>
                        <v-text-field
                            v-model="azienda"
                            label="Azienda"
                            outlined
                            autofocus
                            @keyup.enter="login"
                        ></v-text-field>
                        <v-text-field
                            v-model="username"
                            label="Utente"
                            outlined
                            @keyup.enter="login"
                        ></v-text-field>
                        <v-text-field
                            v-model="password"
                            label="Password"
                            outlined
                            type="password"
                            @keyup.enter="login"
                        ></v-text-field>
                    </v-card-text>
                    <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn color="primary" :loading="loading" @click="login">Login</v-btn>
                    </v-card-actions>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import { authenticateUser, getDefaultRouteForSession, setDbSettings, setSessionCookie } from '@/utils/auth'

export default {
    name: 'LoginPage',
    data() {
        return {
            username: '',
            azienda: '',
            password: '',
            loading: false,
            error: '',
        }
    },
    methods: {
        async login() {
            if (!this.username || !this.password || !this.azienda) {
                this.error = 'Inserisci utente, azienda e password.'
                return
            }

            console.info('[Login] Tentativo login', {
                username: this.username.trim(),
                azienda: this.azienda.trim(),
                dbUrl: this.$dbUrl,
                passwordLength: this.password.length,
            })
            this.loading = true
            this.error = ''

            const authResult = await authenticateUser({
                baseUrl: this.$dbUrl,
                username: this.username.trim(),
                azienda: this.azienda.trim(),
                password: this.password,
            })

            this.loading = false

            if (!authResult || !authResult.ok) {
                console.warn('[Login] Login fallito', authResult)
                if (authResult && authResult.errorCode === 'SERVER_AUTH_INVALID') {
                    this.error = 'Credenziali non valide per l\'accesso al database. Verifica utente e password.'
                } else if (authResult && authResult.errorCode === 'USER_NOT_FOUND') {
                    this.error = 'Utente non trovato.'
                } else if (authResult && authResult.errorCode === 'AZIENDA_MISMATCH') {
                    this.error = 'Azienda non corretta per questo utente.'
                } else {
                    this.error = 'Credenziali non valide.'
                }
                return
            }

            console.info('[Login] Login riuscito', authResult.user)
            await setDbSettings(authResult.dbSettings)
            setSessionCookie(authResult.user)
            this.$router.replace(getDefaultRouteForSession(authResult.user))
        },
    },
}
</script>
