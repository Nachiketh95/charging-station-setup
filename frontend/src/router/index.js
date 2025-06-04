import { createRouter, createWebHistory } from 'vue-router'
import Login from '../pages/Login.vue'
import Chargers from '../pages/Chargers.vue'
import Map from '../pages/Map.vue'
import Register from '../pages/Register.vue'

const routes = [
  { path: '/', component: Login },
  { path: '/register', component: Register },
  { path: '/chargers', name: 'Chargers', component: Chargers },
  { path: '/map', component: Map }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})


export default router;
