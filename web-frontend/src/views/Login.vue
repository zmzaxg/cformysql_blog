<template>
<div style="width:400px;margin:50px auto">
  <h2 align="center">登录</h2>
  <div style="margin:10px 0">
    <input v-model="username" placeholder="用户名" style="width:100%;padding:8px"/>
  </div>
  <div style="margin:10px 0">
    <input v-model="pwd" type="password" placeholder="密码" style="width:100%;padding:8px"/>
  </div>
  <div style="display:flex;gap:10px;align-items:center;margin:10px 0">
    <input v-model="captcha" placeholder="验证码" style="flex:1;padding:8px"/>
    <img :src="captchaUrl" @click="refreshCap" style="height:40px;cursor:pointer"/>
  </div>
  <button @click="login" style="width:100%;padding:10px;background:#007bff;color:#fff;border:none;border-radius:4px">登录</button>
  <p align="center" style="margin-top:15px;color:#007bff;cursor:pointer" @click="$router.push('/register')">没有账号？去注册</p>
</div>
</template>
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api/request'
const router = useRouter()
const username = ref(''), pwd = ref(''), captcha = ref('')
const captchaUrl = ref('')
let capSession = ''
async function refreshCap() {
  const res = await api.get('/api/captcha', { responseType: 'blob' })
  captchaUrl.value = URL.createObjectURL(res.data)
  capSession = res.headers['x-captcha-session']
}
refreshCap()
async function login() {
  const {data} = await api.post('/api/login', {username, pwd})
  localStorage.setItem('token', data.token)
  localStorage.setItem('uid', data.uid)
  localStorage.setItem('role', data.role)
  localStorage.setItem('username', data.username)
  router.push('/dashboard')
}
</script>