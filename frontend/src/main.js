// @ts-nocheck

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import VueGoogleMaps from '@fawmi/vue-google-maps'

const app = createApp(App)

app.use(router)

app.use(VueGoogleMaps, {
  load: {
    key: 'AIzaSyAaaUAZOzSU7aVSNo_tF79l_jHkICV_HQ0'
  }
})

app.mount('#app')
