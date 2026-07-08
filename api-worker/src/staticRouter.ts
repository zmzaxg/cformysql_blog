// 首页 HTML
export function getHomePage(apiBase: string): string {
return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>博客首页</title>
<script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
<script src="https://unpkg.com/vue-router@4/dist/vue-router.global.js"></script>
<script src="https://unpkg.com/axios/dist/axios.min.js"></script>
</head>
<body>
<div id="app"></div>
<script>
const { createApp } = Vue
const { createRouter, createWebHistory } = VueRouter
const api = axios.create({ baseURL: "${apiBase}" })
api.interceptors.request.use(cfg=>{const t=localStorage.getItem('token');if(t)cfg.headers.Authorization='Bearer '+t;return cfg})
const routes = [
  {path:'/',component:{template:\`
<div style="width:1000px;margin:0 auto;padding:20px">
<h1>博客首页</h1>
<div v-for="post in posts" :key="post.post_uuid" style="border:1px solid #eee;padding:15px;margin:10px 0" @click="$router.push('/post/'+post.post_uuid)">
<h3>{{post.title}}</h3>
<p>{{post.content.slice(0,100)}}...</p>
</div>
<div style="padding:10px;text-align:center;border-top:1px solid #eee;margin-top:30px">
<p>数据库集群：总 {{stat.total}} MB | 已用 {{stat.used}} MB | 剩余 {{stat.free}} MB <span v-if="stat.warn" style="color:red">⚠️ 容量不足请扩容</span></p>
</div>
</div>\`,setup(){
const posts = Vue.ref([])
const stat = Vue.ref({total:0,used:0,free:0,warn:false})
async function loadStat(){const r=await api.get('/api/storage-stat');stat.value=r.data}
async function loadPosts(){const t=localStorage.getItem('token');if(t){const r=await api.get('/api/post/my');posts.value=r.data}}
loadStat();loadPosts();setInterval(loadStat,30000)
return {posts,stat}
}}},
  {path:'/login',component:{template:\`
<div style="width:400px;margin:50px auto">
<h2 align="center">登录</h2>
<div><input v-model="u" placeholder="用户名" style="width:100%;padding:8px;margin:10px 0"/></div>
<div><input v-model="p" type="password" placeholder="密码" style="width:100%;padding:8px;margin:10px 0"/></div>
<div style="display:flex;gap:10px"><input v-model="cap" placeholder="验证码" style="flex:1;padding:8px"/><img :src="capImg" @click="refreshCap" style="height:40px;cursor:pointer"/></div>
<button @click="login" style="width:100%;padding:10px;background:#007bff;color:#fff;border:none;margin-top:10px">登录</button>
<p align="center" @click="$router.push('/register')" style="color:#007bff;cursor:pointer;margin-top:15px">没有账号？注册</p>
</div>\`,setup(){
const u=Vue.ref(''),p=Vue.ref(''),cap=Vue.ref(''),capImg=Vue.ref(''),sid=''
async function refreshCap(){const r=await api.get('/api/captcha',{responseType:'blob'});capImg.value=URL.createObjectURL(r.data);sid=r.headers['x-captcha-session']}
async function login(){const r=await api.post('/api/login',{username:u.value,pwd:p.value});localStorage.setItem('token',r.data.token);localStorage.setItem('role',r.data.role);location.href='/dashboard'}
refreshCap()
return {u,p,cap,capImg,refreshCap,login}
}}},
  {path:'/register',component:{template:\`
<div style="width:400px;margin:50px auto">
<h2 align="center">注册</h2>
<div><input v-model="u" placeholder="用户名" style="width:100%;padding:8px;margin:10px 0"/></div>
<div><input v-model="p" type="password" placeholder="密码" style="width:100%;padding:8px;margin:10px 0"/></div>
<div style="display:flex;gap:10px"><input v-model="cap" placeholder="验证码" style="flex:1;padding:8px"/><img :src="capImg" @click="refreshCap" style="height:40px;cursor:pointer"/></div>
<button @click="reg" style="width:100%;padding:10px;background:#28a745;color:#fff;border:none;margin-top:10px">注册</button>
<p align="center" @click="$router.push('/login')" style="color:#007bff;cursor:pointer;margin-top:15px">已有账号？登录</p>
</div>\`,setup(){
const u=Vue.ref(''),p=Vue.ref(''),cap=Vue.ref(''),capImg=Vue.ref(''),sid=''
async function refreshCap(){const r=await api.get('/api/captcha',{responseType:'blob'});capImg.value=URL.createObjectURL(r.data);sid=r.headers['x-captcha-session']}
async function reg(){await api.post('/api/register',{username:u.value,pwd:p.value,captcha:cap.value,sessionId:sid});alert('注册成功');location.href='/login'}
refreshCap()
return {u,p,cap,capImg,refreshCap,reg}
}}},
  {path:'/dashboard',component:{template:\`
<div style="width:1000px;margin:0 auto;padding:20px">
<h2>我的后台</h2>
<div style="border:1px solid #eee;padding:20px;margin-bottom:30px">
<h4>发布文章</h4>
<input v-model="title" placeholder="标题" style="width:100%;padding:8px;margin:10px 0"/>
<textarea v-model="content" rows="6" style="width:100%;padding:8px;margin:10px 0"></textarea>
<button @click="submit" style="padding:8px 20px;background:#007bff;color:#fff;border:none">发布</button>
</div>
<h3>我的文章</h3>
<div v-for="item in list" :key="item.post_uuid" style="border:1px solid #eee;padding:12px;margin:8px 0" @click="$router.push('/post/'+item.post_uuid)">{{item.title}}</div>
<div style="padding:10px;text-align:center;border-top:1px solid #eee;margin-top:30px">
<p>数据库集群：总 {{stat.total}} MB | 已用 {{stat.used}} MB | 剩余 {{stat.free}} MB <span v-if="stat.warn" style="color:red">⚠️ 容量不足请扩容</span></p>
</div>
</div>\`,setup(){
const title=Vue.ref(''),content=Vue.ref(''),list=Vue.ref([]),stat=Vue.ref({total:0,used:0,free:0,warn:false})
async function loadData(){const r=await api.get('/api/post/my');list.value=r.data;const s=await api.get('/api/storage-stat');stat.value=s.data}
async function submit(){await api.post('/api/post/create',{title:title.value,content:content.value,cover:''});alert('发布成功');title.value='';content.value='';loadData()}
loadData();setInterval(async()=>{const s=await api.get('/api/storage-stat');stat.value=s.data},30000)
return {title,content,list,stat,submit}
}}},
  {path:'/admin',component:{template:\`
<div style="width:1200px;margin:0 auto;padding:20px">
<h2>分片管理员面板</h2>
<table border="1" cellpadding="8" style="width:100%;border-collapse:collapse">
<tr><th>ID</th><th>库名</th><th>总容量</th><th>已用</th><th>剩余</th></tr>
<tr v-for="s in shards" :key="s.id">
<td>{{s.id}}</td><td>{{s.db_name}}</td><td>{{s.max_size_mb}}</td><td>{{s.used_size_mb}}</td><td>{{s.max_size_mb - s.used_size_mb}}</td>
</tr>
</table>
<div style="padding:10px;text-align:center;border-top:1px solid #eee;margin-top:30px">
<p>数据库集群：总 {{stat.total}} MB | 已用 {{stat.used}} MB | 剩余 {{stat.free}} MB <span v-if="stat.warn" style="color:red">⚠️ 容量不足请扩容</span></p>
</div>
</div>\`,setup(){
const shards=Vue.ref([]),stat=Vue.ref({total:0,used:0,free:0,warn:false})
async function load(){const r=await api.get('/api/admin/shards');shards.value=r.data.shards;const s=await api.get('/api/storage-stat');stat.value=s.data}
load();setInterval(async()=>{const s=await api.get('/api/storage-stat');stat.value=s.data},30000)
return {shards,stat}
}}},
  {path:'/post/:uuid',component:{template:\`
<div style="width:1000px;margin:0 auto;padding:20px">
<h2>{{article.title}}</h2>
<div style="margin-top:20px;line-height:1.8;font-size:16px">{{article.content}}</div>
<div style="padding:10px;text-align:center;border-top:1px solid #eee;margin-top:30px">
<p>数据库集群：总 {{stat.total}} MB | 已用 {{stat.used}} MB | 剩余 {{stat.free}} MB <span v-if="stat.warn" style="color:red">⚠️ 容量不足请扩容</span></p>
</div>
</div>\`,setup(props){
const route = VueRouter.useRoute()
const article = Vue.ref({})
const stat = Vue.ref({total:0,used:0,free:0,warn:false})
async function load(){const r=await api.get('/api/post/'+route.params.uuid);article.value=r.data;const s=await api.get('/api/storage-stat');stat.value=s.data}
load();setInterval(async()=>{const s=await api.get('/api/storage-stat');stat.value=s.data},30000)
return {article,stat}
}}},
]
const router = createRouter({history:createWebHistory(),routes})
createApp({template:\`
<nav style="padding:10px;border-bottom:1px solid #eee;display:flex;gap:20px;justify-content:center">
<router-link to="/">首页</router-link>
<router-link to="/login">登录</router-link>
<router-link to="/register">注册</router-link>
<router-link to="/dashboard">我的后台</router-link>
<router-link v-if="localStorage.getItem('role')==='super_admin'" to="/admin">分片管理</router-link>
</nav>
<router-view/>
\`\`}).use(router).mount('#app')
</script>
</body>
</html>`
}