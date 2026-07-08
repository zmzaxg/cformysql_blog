<template>
  <div class="footer-stat">
    <p>数据库集群容量：总 {{ stat.total }} MB | 已占用 {{ stat.used }} MB | 剩余 {{ stat.free }} MB
      <span v-if="stat.warn" style="color:red;font-weight:bold"> ⚠️ 存储空间不足，请新增blog0to分片扩容！</span>
    </p>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import api from '../api/request'
const stat = ref({ total:0, used:0, free:0, warn:false })
async function loadStat() {
  const res = await api.get('/api/storage-stat')
  stat.value = res.data
}
onMounted(() => {
  loadStat()
  setInterval(loadStat, 30000)
})
</script>
<style scoped>
.footer-stat { padding: 10px; text-align: center; border-top: 1px solid #eee; margin-top: 30px; }
</style>