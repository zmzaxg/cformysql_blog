<template>
<div style="width:1000px;margin:0 auto;padding:20px">
  <h1>博客首页</h1>
  <div v-for="post in posts" :key="post.post_uuid" style="border:1px solid #eee;padding:15px;margin:10px 0;cursor:pointer" @click="$router.push('/post/'+post.post_uuid)">
    <h3>{{post.title}}</h3>
    <p>{{post.content.slice(0,100)}}...</p>
  </div>
  <FooterStat />
</div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import FooterStat from '../components/FooterStat.vue'
import api from '../api/request'
const posts = ref([])
onMounted(async ()=>{
  const token = localStorage.getItem('token')
  if(token){
    const res = await api.get('/api/post/my')
    posts.value = res.data
  }
})
</script>