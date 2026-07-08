<template>
<div style="width:1200px;margin:0 auto;padding:20px">
  <h2>数据库分片监控面板（管理员）</h2>
  <table border="1" cellpadding="8" style="width:100%;margin:20px 0;border-collapse:collapse">
    <tr>
      <th>分片ID</th>
      <th>分片库名</th>
      <th>总容量MB</th>
      <th>已使用MB</th>
      <th>剩余容量MB</th>
    </tr>
    <tr v-for="s in shards" :key="s.id">
      <td>{{s.id}}</td>
      <td>{{s.db_name}}</td>
      <td>{{s.max_size_mb}}</td>
      <td>{{s.used_size_mb}}</td>
      <td>{{s.max_size_mb - s.used_size_mb}}</td>
    </tr>
  </table>
  <FooterStat />
</div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import FooterStat from '../components/FooterStat.vue'
import api from '../api/request'
const shards = ref([])
onMounted(async ()=>{
  const res = await api.get('/api/admin/shards')
  shards.value = res.data.shards
})
</script>