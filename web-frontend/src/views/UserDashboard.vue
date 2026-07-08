<template>
<div style="width:1000px;margin:0 auto;padding:20px">
  <h2>我的博客后台</h2>
  <div style="border:1px solid #eee;padding:20px;margin-bottom:30px">
    <h4>发布新文章</h4>
    <input v-model="title" placeholder="文章标题" style="width:100%;padding:8px;margin:10px 0"/>
    <textarea v-model="content" placeholder="文章正文" rows="6" style="width:100%;padding:8px;margin:10px 0"></textarea>
    <button @click="createPost" style="padding:8px 20px;background:#007bff;color:#fff;border:none">发布文章</button>
  </div>
  <h3>我的全部文章</h3>
  <div v-for="p in myPosts" :key="p.post_uuid" style="border:1px solid #eee;padding:12px;margin:8px 0;cursor:pointer" @click="$router.push('/post/'+p.post_uuid)">
    {{p.title}}
  </div>
  <FooterStat />
</div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import FooterStat from '../components/FooterStat.vue'
import api from '../api/request'
const title = ref(''), content = ref(''), myPosts = ref([])
async function loadMyPost() {
  const res = await api.get('/api/post/my')
  myPosts.value = res.data
}
async function createPost() {
  await api.post('/api/post/create', {title, content, cover:''})
  alert('发布成功')
  title.value = ''
  content.value = ''
  loadMyPost()
}
onMounted(loadMyPost)
</script>