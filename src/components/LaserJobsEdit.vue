<template>
    <div>
       <lj-app-bar :dbs="dbs" :connection-status="connectionStatus"/>
        <v-card
            v-if="currentJob"
            class="in-corso-card"
            outlined
        >
            <v-card-title class="in-corso-title text-h5">
                Lavorazione in corso
            </v-card-title>
            <v-card-text class="in-corso-content">
                <v-row align="center">
                    <v-col cols="12" md="1" class="text-center">
                        <v-icon
                            x-large
                            :color="currentJob.doc.color && currentJob.doc.color.hexa"
                        >
                            mdi-checkbox-blank-circle
                        </v-icon>
                    </v-col>
                    <v-col cols="12" md="2" class="text-h4 font-weight-bold">
                        {{ currentJob.doc.data_consegna | moment('L') }}
                    </v-col>
                    <v-col cols="12" md="3" class="text-h3 font-weight-bold">
                        {{ currentJob.doc.codice }}
                    </v-col>
                    <v-col cols="12" md="4" class="text-h4 font-weight-medium">
                        {{ currentJob.doc.descrizione }}
                    </v-col>
                    <v-col cols="12" md="2" class="d-flex justify-end">
                        <v-checkbox
                            v-model="currentJob.doc.in_corso"
                            class="mt-0 pt-0 in-corso-checkbox"
                            hide-details
                            label="In corso"
                            @change="toggleInCorso(currentJob)"
                        ></v-checkbox>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>
        <v-data-iterator
            :items="jobsTodo"
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
                        <v-col class="flex-shrink-1 flex-grow-0" v-if="!showDeleted">
                            <v-btn @click="newjob()" color="green">Aggiungi (CRL+A)</v-btn>
                        </v-col>
                        <v-col class="flex-shrink-1 flex-grow-0" v-if="!showDeleted">
                            <v-btn @click="exportJobsExcel()" color="teal">
                                <v-icon left>mdi-microsoft-excel</v-icon>
                                Esporta Excel
                            </v-btn>
                        </v-col>
                        <v-col class="flex-shrink-1 flex-grow-0" v-if="!showDeleted">
                            <v-btn @click="openImportDialog()" color="indigo">
                                <v-icon left>mdi-file-import</v-icon>
                                Importa Excel
                            </v-btn>
                            <input
                                ref="excelImport"
                                type="file"
                                accept=".csv,text/csv"
                                style="display: none"
                                @change="importJobsExcel"
                            >
                        </v-col>
                        <v-col class="flex-shrink-1 flex-grow-0">
                            <v-btn @click="showDeleted = !showDeleted" :color="showDeleted ? 'green':'blue'">
                                <v-icon left>{{ showDeleted ? 'mdi-archive-off' : 'mdi-archive' }}</v-icon>
                                Archivio
                            </v-btn>
                        </v-col>
                    </v-row>
                </v-toolbar>
            </template>
            <template v-slot:default="props">
                <v-simple-table>
                    <template v-slot:default>
                        <thead>
                        <tr class="caption text-uppercase">
                            <th scope="col" style="width: 1%">
                                <bt-sort v-model="sort" label="" field="doc.ordinamento"/>
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
                                <bt-sort v-model="sort" label="Consegna" field="doc.data_consegna"/>
                            </th>
                            <th scope="col">
                                <bt-sort v-model="sort" label="In corso" field="doc.in_corso"/>
                            </th>
                            <th scope="col">
                                <bt-sort v-model="sort" label="Fatto" field="doc.done"/>
                            </th>
                            <th scope="col">
                                <bt-sort v-model="sort" label="Sospeso" field="doc.sospeso"/>
                            </th>
                            <th scope="col" style="width: 1%" colspan="2">
                            
                            </th>
                        
                        </tr>
                        </thead>
                        <tbody id="jobsTable">
                        <tr v-for="item in props.items" v-bind:key="item.id" :data-id="item.id"
                            :class="rowClasses(item)">
                            <td class="sort-handle text-center" style="width: 1%">
                                <v-icon>mdi-drag</v-icon>
                            </td>
                            <td>
                                <v-color-picker v-model="item.doc.color" hide-canvas hide-inputs tabindex="-1"
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
                                    :ref="`codice-${item.id}`"
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
                            <td style="width: 10%">
                                <v-menu
                                    ref="datainiziomenu"
                                    v-model="datainiziomenu[item.id]"
                                    :close-on-content-click="false"
                                    :return-value.sync="item.doc.data_consegna"
                                    transition="scale-transition"
                                    offset-y
                                    min-width="auto"
                                >
                                    <template v-slot:activator="{ on, attrs }">
                                        <v-text-field
                                            class="mr-2"
                                            v-model="item.doc.data_consegna"
                                            label="Consegna"
                                            prepend-icon="mdi-calendar"
                                            v-bind="attrs"
                                            v-on="on"
                                            @change="save(item)"
                                        ></v-text-field>
                                    </template>
                                    <v-date-picker
                                        v-model="item.doc.data_consegna"
                                        no-title
                                        scrollable
                                    >
                                        <v-spacer></v-spacer>
                                        <v-btn
                                            text
                                            color="primary"
                                            @click="datainiziomenu[item.id] = false"
                                        >
                                            Cancel
                                        </v-btn>
                                        <v-btn
                                            text
                                            color="primary"
                                            @click="save(item)"
                                        >
                                            OK
                                        </v-btn>
                                    </v-date-picker>
                                </v-menu>
                            
                            </td>
                            <td style="width: 1%">
                                <v-row dense class='d-flex justify-center'>
                                    <v-checkbox
                                        tabindex="-1"
                                        v-model="item.doc.in_corso"
                                        dense
                                        flat
                                        hide-details
                                        outlined
                                        placeholder="In corso"
                                        single-line
                                        type="text"
                                        @change="toggleInCorso(item)"
                                    ></v-checkbox>
                                </v-row>
                            </td>
                            <td style="width: 1%">
                                <v-row dense class='d-flex justify-center'>
                                    <v-checkbox
                                        tabindex="-1"
                                        v-model="item.doc.done"
                                        :disabled="item.doc.sospeso"
                                        dense
                                        flat
                                        hide-details
                                        outlined
                                        placeholder="Fatto"
                                        single-line
                                        type="text"
                                        @change="save(item)"
                                    ></v-checkbox>
                                </v-row>
                            </td>
                            <td style="width: 1%">
                                <v-row dense class='d-flex justify-center'>
                                    <v-checkbox
                                        tabindex="-1"
                                        v-model="item.doc.sospeso"
                                        :disabled="item.doc.done"
                                        dense
                                        flat
                                        hide-details
                                        outlined
                                        placeholder="Fatto"
                                        single-line
                                        type="text"
                                        @change="save(item)"
                                    ></v-checkbox>
                                </v-row>
                            </td>
                            <td style="width: 1%" class="text-no-wrap">
                                {{ item.doc.date | moment('LLL') }}
                            </td>
                            
                            <td style="width: 1%">
                                <v-btn @click="deleteJob(item)" color="orange" tabindex="-1" v-if="!item.doc.deleted">
                                    <v-icon>mdi-delete</v-icon>
                                </v-btn>
                                <v-btn @click="restoreJob(item)" color="info" tabindex="-1" v-if="item.doc.deleted">
                                    <v-icon>mdi-restore</v-icon>
                                </v-btn>
                                <v-btn @click="permanentDeleteJob(item)" color="red" tabindex="-1" v-if="showDeleted && item.doc.deleted">
                                    <v-icon>mdi-delete-forever</v-icon>
                                </v-btn>
                            </td>
                        
                        </tr>
                        </tbody>
                    </template>
                </v-simple-table>
            </template>
        
        </v-data-iterator>
        <v-dialog v-model="loginPopUp">
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
                        @keyup.enter="login()"
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
    import LjAppBar from "@/components/include/LjAppBar.vue";
    
    export default {
        mixins: [commonMixin],
        data() {
            return {
                datainiziomenu: {},
                findcodice: '',
                showDeleted: false,
            }
        },
        computed: {
            currentJob() {
                return this.getInCorsoJobs()[0] || null
            },
            jobsTodo() {
                if (this.filteredJobs) {
                    if (this.showDeleted) {
                        return this.filteredJobs.filter((job) => job.doc.deleted);
                    } else {
                        return this.filteredJobs.filter((job) => !job.doc.deleted);
                    }
                } else {
                    return undefined
                }
            },
        },
        components: {
            LjAppBar,
            btSort
        },
        name: "LaserJobsEdit",
        created() {
            window.addEventListener("keydown", this.shortcuts);
        },
        destroyed() {
            window.removeEventListener("keydown", this.shortcuts);
        },
        methods: {
            rowClasses(item) {
                return {
                    cFatto: item.doc.done,
                    cSospeso: !item.doc.done && item.doc.sospeso,
                    cInCorso: item.doc.in_corso,
                }
            },
            async toggleInCorso(item) {
                item.doc.date = new Date()
                const docsToSave = [item.doc]

                if (item.doc.in_corso) {
                    (this.jobs || [])
                        .filter((job) => job.id !== item.id && job.doc.in_corso)
                        .forEach((job) => {
                            job.doc.in_corso = false
                            job.doc.date = new Date()
                            docsToSave.push(job.doc)
                        })
                }

                await Promise.all(docsToSave.map((doc) => this.db.put(doc)))
                await this.enforceSingleInCorso(item.doc.in_corso ? item.id : null)
            },
            shortcuts(e) {
                if (e.ctrlKey && e.keyCode === 65 && !this.loginPopUp) {
                    e.preventDefault();
                    this.newjob().then((job) => {
                        // focus on codice
                        this.findcodice = setInterval(() => {
                            if (this.$refs[`codice-${job.id}`]) {
                                this.$refs[`codice-${job.id}`][0].focus();
                                clearInterval(this.findcodice);
                            }
                        }, 100);
                    });
                }
            },
            save: _.debounce(
                function (item) {
                    item.doc.date = new Date();
                    this.db.put(item.doc);
                    this.datainiziomenu[item.id] = false
                },
            ),
            saveColor: _.debounce(
                function (item) {
                    item.doc.date = new Date();
                    this.db.put(item.doc);
                },
            ),
            newjob: async function () {
                return this.db.post({
                    codice: "",
                    descrizione: "",
                    in_corso: false,
                    ordinamento: 500,
                    date: new Date(),
                }).then((job) => {
                    this.updateSort();
                    return job;
                });
            },
            deleteJob(job) {
                job.doc.date = new Date();
                job.doc.deleted = true;
                this.db.put(job.doc);
                /*
                this.db.remove(job.doc).then(() => {
                    this.updateSort();
                });
                */
            },
            restoreJob(job) {
                job.doc.date = new Date();
                job.doc.deleted = false;
                this.db.put(job.doc);
                /*
                this.db.remove(job.doc).then(() => {
                    this.updateSort();
                });
                */
            },
            permanentDeleteJob(job) {
                const confirmed = window.confirm('Confermi cancellazione definitiva?')
                if (!confirmed) {
                    return
                }
                this.db.remove(job.doc).then(() => {
                    this.updateSort();
                });
            },
            openImportDialog() {
                this.$refs.excelImport.click();
            },
            exportJobsExcel() {
                const headers = ['codice', 'descrizione', 'data_consegna', 'done', 'in_corso', 'sospeso', 'ordinamento', 'color_hexa'];
                const activeJobs = (this.jobs || [])
                    .filter((job) => !job.doc.deleted)
                    .sort((a, b) => (a.doc.ordinamento || 0) - (b.doc.ordinamento || 0));

                const rows = activeJobs.map((job) => {
                    return [
                        this.toCsvValue(job.doc.codice),
                        this.toCsvValue(job.doc.descrizione),
                        this.toCsvValue(job.doc.data_consegna),
                        this.toCsvValue(job.doc.done ? 1 : 0),
                        this.toCsvValue(job.doc.in_corso ? 1 : 0),
                        this.toCsvValue(job.doc.sospeso ? 1 : 0),
                        this.toCsvValue(job.doc.ordinamento),
                        this.toCsvValue(job.doc.color && job.doc.color.hexa ? job.doc.color.hexa : ''),
                    ].join(';');
                });

                const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
                const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
                link.href = url;
                link.download = `laserjobs-attivi-${timestamp}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            },
            toCsvValue(value) {
                const str = value === undefined || value === null ? '' : String(value);
                const escaped = str.replace(/"/g, '""');
                if (/[;"\r\n]/.test(escaped)) {
                    return `"${escaped}"`;
                }
                return escaped;
            },
            importJobsExcel(event) {
                const file = event.target.files && event.target.files[0];
                if (!file) {
                    return;
                }

                const reader = new FileReader();
                reader.onload = async (loadEvent) => {
                    try {
                        const content = String(loadEvent.target.result || '').replace(/^\uFEFF/, '');
                        const rows = this.parseCsvRows(content);
                        if (!rows.length) {
                            window.alert('File vuoto.');
                            return;
                        }

                        const header = rows[0].map((h) => String(h || '').trim().toLowerCase());
                        const expected = ['codice', 'descrizione', 'data_consegna', 'done', 'in_corso', 'sospeso', 'ordinamento', 'color_hexa'];
                        if (header.join('|') !== expected.join('|')) {
                            window.alert('Formato file non valido. Usa un file esportato da LaserJobs.');
                            return;
                        }

                        const confirmed = window.confirm('Confermi importazione jobs attivi?');
                        if (!confirmed) {
                            return;
                        }

                        const docs = rows.slice(1)
                            .filter((row) => row.some((c) => String(c || '').trim() !== ''))
                            .map((row, index) => {
                                const colorHexa = String(row[7] || '').trim();
                                return {
                                    codice: String(row[0] || '').trim(),
                                    descrizione: String(row[1] || '').trim(),
                                    data_consegna: String(row[2] || '').trim(),
                                    done: this.toBoolean(row[3]),
                                    in_corso: this.toBoolean(row[4]),
                                    sospeso: this.toBoolean(row[5]),
                                    ordinamento: this.toNumber(row[6], 500 + index),
                                    date: new Date(),
                                    deleted: false,
                                    color: colorHexa ? {hexa: colorHexa} : undefined,
                                };
                            });

                        await Promise.all(docs.map((doc) => this.db.post(doc)));
                        window.alert(`Import completato: ${docs.length} job.`);
                    } catch (e) {
                        console.error(e);
                        window.alert('Errore durante importazione file.');
                    } finally {
                        event.target.value = '';
                    }
                };
                reader.readAsText(file);
            },
            parseCsvRows(content) {
                const rows = [];
                let row = [];
                let current = '';
                let inQuotes = false;

                for (let i = 0; i < content.length; i++) {
                    const char = content[i];
                    const next = content[i + 1];

                    if (char === '"') {
                        if (inQuotes && next === '"') {
                            current += '"';
                            i++;
                        } else {
                            inQuotes = !inQuotes;
                        }
                        continue;
                    }

                    if (!inQuotes && char === ';') {
                        row.push(current);
                        current = '';
                        continue;
                    }

                    if (!inQuotes && (char === '\n' || char === '\r')) {
                        if (char === '\r' && next === '\n') {
                            i++;
                        }
                        row.push(current);
                        rows.push(row);
                        row = [];
                        current = '';
                        continue;
                    }

                    current += char;
                }

                if (current.length || row.length) {
                    row.push(current);
                    rows.push(row);
                }

                return rows;
            },
            toBoolean(value) {
                const normalized = String(value || '').trim().toLowerCase();
                return ['1', 'true', 'si', 'sì', 'yes'].includes(normalized);
            },
            toNumber(value, fallback) {
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : fallback;
            },
        }
    }
</script>

<style scoped>
.in-corso-card {
    margin-bottom: 24px;
    border: 3px solid #ef6c00 !important;
    background: linear-gradient(135deg, #fff8e1 0%, #ffe0b2 100%);
    box-shadow: 0 18px 40px rgba(239, 108, 0, 0.18);
}

.in-corso-title {
    background: rgba(239, 108, 0, 0.12);
    color: #bf360c;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

.in-corso-content {
    padding-top: 28px !important;
    padding-bottom: 28px !important;
}

.in-corso-checkbox {
    background: rgba(255, 255, 255, 0.72);
    border-radius: 12px;
    padding: 8px 12px;
}

::v-deep .theme--light.v-sheet {
    background-color: unset !important;
}

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

.cInCorso {
    background: #fff8e1;
}
</style>
