import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import PostDetail from '../views/PostDetail.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import UserDashboard from '../views/UserDashboard.vue'
import AdminPanel from '../views/AdminPanel.vue'

// 登录拦截
function requireAuth(to, from, next) {
  const token = localStorage.getItem('token')
  if (!token) next('/login')
  else next()
}
// 管理员拦截
function requireAdmin(to, from, next) {
  const role = localStorage.getItem('role')
  if (role !== 'super_admin') next('/dashboard')
  else next()
}

const routes = [
  { path: '/', component: Home },
  { path: '/post/:uuid', component: PostDetail },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/dashboard', component: UserDashboard, beforeEnter: requireAuth },
  { path: '/admin', component: AdminPanel, beforeEnter: [requireAuth, requireAdmin] }
]
const router = createRouter({ history: createWebHistory(), routes })
export default router