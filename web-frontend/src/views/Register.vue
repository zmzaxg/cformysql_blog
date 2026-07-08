<template>
<div style="width:400px;margin:50px auto">
  <h2 align="center">注册账号</h2>
  <div style="margin:10px 0">
    <input v-model="username" placeholder="用户名" style="width:100%;padding:8px"/>
  </div>
  <div style="margin:10px 0">
    <input v-model="pwd" type="password" placeholder="密码" style="width:100%;padding:8px"/>
  </div>
  <div style="display:flex;gap:10px;align-items:center;margin:10px 0">
    <input v-model="captcha" placeholder="验证码" style="flex:1;padding:8px"/>
    <img :src="capUrl" @click="reCap" style="height:40px;cursor:pointer"/>
  </div>
  <button @click="reg" style="width:100%;padding:10px;background:#28a745;color:#fff;border:none;border-radius:4px">注册</button>
  <p align="center" style="margin-top:15px;color:#007bff;cursor:pointer" @click="$router.push('/login')">已有账号？登录</p>
</div>
</template>
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api/request'
const router = useRouter()
const username = ref(''), pwd = ref(''), captcha = ref('')
const capUrl = ref('')
let sid = ''
async function reCap() {
  const res = await api.get('/api/captcha', {responseType:'blob'})
  capUrl.value = URL.createObjectURL(res.data)
  sid = res.headers['x-captcha-session']
}
reCap()
async function reg() {
  await api.post('/api/register', {username, pwd, captcha, sessionId:sid})
  alert('注册成功，请登录')
  router.push('/login')
}
</script>