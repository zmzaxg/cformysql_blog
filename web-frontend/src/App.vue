<template>
<nav style="padding:10px;border-bottom:1px solid #eee;gap:20px;display:flex;justify-content:center">
  <router-link to="/">首页</router-link>
  <router-link to="/login">登录</router-link>
  <router-link to="/register">注册</router-link>
  <router-link to="/dashboard">我的后台</router-link>
  <router-link v-if="localStorage.getItem('role') === 'super_admin'" to="/admin">分片管理</router-link>
</nav>
<router-view />
</template>