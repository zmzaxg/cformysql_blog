import { Hono } from "hono"
import { cors } from "hono/cors"
import { queryIndexDB, runSQL, createDynamicHyperdrive, getDbByPurpose, getDbById } from "./db"
import {
  createCaptchaSvg, createToken, parseToken, hashPwd, comparePwd,
  calcStorageStat, pickWriteShard, uuid, getCache, setCache, cleanExpiredAll
} from "./util"
import { getHomePage } from "./staticRouter"
import type { UserRole, GlobalUser, DbListItem, BlogShardRecord } from "./types"

type Env = {
  INDEX_POOL: Hyperdrive
  JWT_SECRET: string
  R2_DOMAIN: string
}

const app = new Hono<{ Bindings: Env }>()
app.use("*", cors({ origin: "*", allowMethods: ["GET", "POST", "PUT", "DELETE"] }))

// ========== 静态页面路由（所有页面由Worker直接返回，不需要Pages） ==========
app.get("/*", async (c, next) => {
  const path = c.req.path
  // API接口走后续逻辑，其余全部返回前端页面
  if (path.startsWith("/api/")) return next()
  const workerUrl = new URL(c.req.url).origin
  const html = getHomePage(workerUrl)
  return c.html(html)
})

// ==================== API接口区域 ====================
// 1. 全局容量统计
app.get("/api/storage-stat", async (c) => {
  const indexPool = c.env.INDEX_POOL
  let stat = await getCache(indexPool, "storage_stat")
  if (!stat) {
    stat = await calcStorageStat(indexPool)
    await setCache(indexPool, "storage_stat", stat, 300)
  }
  return c.json(stat)
})

// 2. 图形验证码
app.get("/api/captcha", async (c) => {
  const indexPool = c.env.INDEX_POOL
  const cap = createCaptchaSvg()
  const sessionId = uuid()
  const now = Math.floor(Date.now() / 1000)
  const expire = now + 300

  const metaDbItem = await getDbByPurpose(indexPool, "博客0数据库索引")
  const metaHD = createDynamicHyperdrive(metaDbItem)

  await runSQL(metaHD, `
    INSERT INTO captcha_store(session_sn, captcha_code, biz_scene, expire_unix, is_consumed)
    VALUES (?,?,?,?,0)
  `, [sessionId, cap.text.toLowerCase(), "register", expire])

  return c.body(cap.svg, { headers: { "Content-Type": "image/svg+xml", "X-Captcha-Session": sessionId } })
})

// 3. 注册
app.post("/api/register", async (c) => {
  const indexPool = c.env.INDEX_POOL
  const { username, pwd, captcha, sessionId } = await c.req.json()
  const now = Math.floor(Date.now() / 1000)

  const metaDbItem = await getDbByPurpose(indexPool, "博客0数据库索引")
  const metaHD = createDynamicHyperdrive(metaDbItem)

  const capRes = await runSQL(metaHD, `
    SELECT captcha_code, is_consumed FROM captcha_store
    WHERE session_sn = ? AND biz_scene = 'register' AND expire_unix > ?
  `, [sessionId, now])
  if (capRes.rows.length === 0) return c.json({ msg: "验证码失效，请刷新" }, 400)
  const capData = capRes.rows[0]
  if (capData.is_consumed === 1) return c.json({ msg: "验证码已使用" }, 400)
  if (capData.captcha_code !== captcha.toLowerCase()) return c.json({ msg: "验证码错误" }, 400)

  const exist = await runSQL(metaHD, `SELECT uid FROM global_users WHERE username = ?`, [username])
  if (exist.rows.length > 0) return c.json({ msg: "用户名已存在" }, 400)

  const hash = hashPwd(pwd)
  const ip = c.req.header("CF-Connecting-IP") || "0.0.0.0"
  await runSQL(metaHD, `
    INSERT INTO global_users(username, password_hash, register_ip) VALUES (?,?,?)
  `, [username, hash, ip])

  await runSQL(metaHD, `UPDATE captcha_store SET is_consumed = 1 WHERE session_sn = ?`, [sessionId])
  return c.json({ msg: "注册成功" })
})

// 4. 登录
app.post("/api/login", async (c) => {
  const indexPool = c.env.INDEX_POOL
  const { username, pwd } = await c.req.json()
  const metaDbItem = await getDbByPurpose(indexPool, "博客0数据库索引")
  const metaHD = createDynamicHyperdrive(metaDbItem)

  const userRes = await runSQL(metaHD, `
    SELECT uid, username, password_hash, role, status FROM global_users WHERE username = ?
  `, [username])
  if (userRes.rows.length === 0) return c.json({ msg: "账号不存在" }, 400)
  const user = userRes.rows[0] as GlobalUser
  if (user.status !== 1) return c.json({ msg: "账号已封禁" }, 400)
  if (!comparePwd(pwd, user.password_hash)) return c.json({ msg: "密码错误" }, 400)

  const ip = c.req.header("CF-Connecting-IP") || "0.0.0.0"
  await runSQL(metaHD, `
    UPDATE global_users SET last_login_time = NOW(), last_login_ip = ? WHERE uid = ?
  `, [ip, user.uid])

  const token = await createToken(user.uid, user.role, c.env.JWT_SECRET)
  return c.json({ token, uid: user.uid, role: user.role, username: user.username })
})

// 登录鉴权中间件
const authMid = async (c, next) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "")
  if (!token) return c.json({ msg: "未登录" }, 401)
  const payload = await parseToken(token, c.env.JWT_SECRET)
  if (!payload) return c.json({ msg: "登录失效" }, 401)
  c.set("user", payload)
  await next()
}

// 获取用户信息
app.get("/api/user/info", authMid, async (c) => {
  const indexPool = c.env.INDEX_POOL
  const user = c.get("user")
  const metaDbItem = await getDbByPurpose(indexPool, "博客0数据库索引")
  const metaHD = createDynamicHyperdrive(metaDbItem)
  const info = await runSQL(metaHD, `
    SELECT uid, username, email, role FROM global_users WHERE uid = ?
  `, [user.uid])
  return c.json(info.rows[0])
})

// 创建博文（均衡分片写入）
app.post("/api/post/create", authMid, async (c) => {
  const indexPool = c.env.INDEX_POOL
  const { title, content, cover } = await c.req.json()
  const user = c.get("user")
  const postUuid = uuid()

  const targetShard = await pickWriteShard(indexPool)
  const shardHD = createDynamicHyperdrive(targetShard)

  const postRes = await runSQL(shardHD, `
    INSERT INTO blog_post(post_uuid, title, content, cover_r2_url) VALUES (?,?,?,?)
  `, [postUuid, title, content, cover])
  const localId = postRes.meta.insertId

  const metaDbItem = await getDbByPurpose(indexPool, "博客0数据库索引")
  const metaHD = createDynamicHyperdrive(metaDbItem)
  await runSQL(metaHD, `
    INSERT INTO blog_shard_record(post_global_id, owner_uid, db_list_row_id, post_local_id)
    VALUES (?,?,?,?)
  `, [postUuid, user.uid, targetShard.id, localId])

  return c.json({ msg: "发布成功", uuid: postUuid })
})

// 获取我的全部博文
app.get("/api/post/my", authMid, async (c) => {
  const indexPool = c.env.INDEX_POOL
  const user = c.get("user")
  const metaDbItem = await getDbByPurpose(indexPool, "博客0数据库索引")
  const metaHD = createDynamicHyperdrive(metaDbItem)

  const records = await runSQL(metaHD, `
    SELECT post_global_id, db_list_row_id, post_local_id FROM blog_shard_record WHERE owner_uid = ?
  `, [user.uid])

  const groupMap = new Map<number, BlogShardRecord[]>()
  records.rows.forEach(r => {
    if (!groupMap.has(r.db_list_row_id)) groupMap.set(r.db_list_row_id, [])
    groupMap.get(r.db_list_row_id).push(r)
  })

  const result: any[] = []
  for (const [dbId, itemList] of groupMap) {
    const shardInfo = await getDbById(indexPool, dbId)
    const shardHD = createDynamicHyperdrive(shardInfo)
    const ids = itemList.map(i => i.post_local_id).join(",")
    const posts = await runSQL(shardHD, `SELECT * FROM blog_post WHERE post_id IN (${ids})`)
    result.push(...posts.rows)
  }
  return c.json(result)
})

// 单篇文章详情
app.get("/api/post/:uuid", async (c) => {
  const indexPool = c.env.INDEX_POOL
  const targetUuid = c.req.param("uuid")
  const metaDbItem = await getDbByPurpose(indexPool, "博客0数据库索引")
  const metaHD = createDynamicHyperdrive(metaDbItem)

  const recRes = await runSQL(metaHD, `
    SELECT db_list_row_id, post_local_id FROM blog_shard_record WHERE post_global_id = ?
  `, [targetUuid])
  if (recRes.rows.length === 0) return c.json({ msg: "文章不存在" }, 404)
  const rec = recRes.rows[0]

  const shardInfo = await getDbById(indexPool, rec.db_list_row_id)
  const shardHD = createDynamicHyperdrive(shardInfo)
  const post = await runSQL(shardHD, `SELECT * FROM blog_post WHERE post_id = ?`, [rec.post_local_id])
  return c.json(post.rows[0])
})

// 管理员分片监控
app.get("/api/admin/shards", authMid, async (c) => {
  const indexPool = c.env.INDEX_POOL
  const user = c.get("user")
  if (user.role !== "super_admin") return c.json({ msg: "无管理员权限" }, 403)

  const shards = await queryIndexDB(indexPool, `
    SELECT id, db_name, max_size_mb, used_size_mb, purpose FROM db_list WHERE purpose LIKE '博客0数据%'
  `)

  const metaDbItem = await getDbByPurpose(indexPool, "博客0数据库索引")
  const metaHD = createDynamicHyperdrive(metaDbItem)
  const weights = await runSQL(metaHD, `SELECT db_list_row_id, write_weight, is_enable FROM shard_write_strategy`)

  return c.json({ shards: shards.rows, weightCfg: weights.rows })
})

// 定时Cron任务
app.cron("0 * * * *", async (c) => {
  const indexPool = c.env.INDEX_POOL
  const stat = await calcStorageStat(indexPool)
  await setCache(indexPool, "storage_stat", stat, 300)
  await cleanExpiredAll(indexPool)
})

export default app