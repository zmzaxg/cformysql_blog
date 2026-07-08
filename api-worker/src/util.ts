import { sign, verify } from "hono/jwt"
import svgCaptcha from "svg-captcha"
import { queryIndexDB, runSQL, createDynamicHyperdrive, getDbByPurpose } from "./db"
import type { DbListItem, ShardWeightCfg, StorageStat } from "./types"
import bcrypt from "bcryptjs"

// JWT鉴权工具
export async function createToken(uid: number, role: string, secret: string) {
  const payload = { uid, role, exp: Math.floor(Date.now() / 1000) + 86400 }
  return await sign(payload, secret)
}

export async function parseToken(token: string, secret: string) {
  try {
    return await verify(token, secret)
  } catch {
    return null
  }
}

// 生成图形验证码SVG
export function createCaptchaSvg() {
  return svgCaptcha.create({ size: 4, noise: 3, color: true })
}

// BCrypt密码加密对比
export function hashPwd(pwd: string) {
  return bcrypt.hashSync(pwd, 10)
}
export function comparePwd(raw: string, hash: string) {
  return bcrypt.compareSync(raw, hash)
}

// UUID全局唯一ID
export function uuid() {
  return crypto.randomUUID()
}

// 全局分片容量统计（页脚展示）
export async function calcStorageStat(indexPool: Hyperdrive): Promise<StorageStat> {
  const res = await queryIndexDB(indexPool, `
    SELECT max_size_mb, used_size_mb FROM db_list
    WHERE purpose LIKE '博客0数据%' AND status = 1
  `)
  let total = 0, used = 0
  res.rows.forEach((row) => {
    total += Number(row.max_size_mb)
    used += Number(row.used_size_mb)
  })
  const free = total - used
  const warn = free / total < 0.1
  return { total, used, free, warn }
}

// 加权随机均衡分片选择
export async function pickWriteShard(indexPool: Hyperdrive): Promise<DbListItem> {
  // 1. 获取所有可用博客分片
  const shardRes = await queryIndexDB(indexPool, `
    SELECT id, db_host, db_port, db_user, db_pass, db_name, max_size_mb, used_size_mb
    FROM db_list WHERE purpose LIKE '博客0数据%' AND status = 1
  `)
  const shards = shardRes.rows as DbListItem[]

  // 2. 读取分片权重配置表
  const metaDbItem = await getDbByPurpose(indexPool, "博客0数据库索引")
  const metaHD = createDynamicHyperdrive(metaDbItem)
  const weightRes = await runSQL(metaHD, `
    SELECT db_list_row_id, write_weight FROM shard_write_strategy WHERE is_enable = 1
  `)
  const weightMap = new Map<number, number>()
  weightRes.rows.forEach((r: ShardWeightCfg) => weightMap.set(r.db_list_row_id, r.write_weight))

  // 3. 根据剩余容量动态修正权重
  let totalWeight = 0
  const pool: { shard: DbListItem; w: number }[] = []
  for (const s of shards) {
    const free = s.max_size_mb - s.used_size_mb
    let w = weightMap.get(s.id) ?? 10
    // 占用超90% 禁止写入
    if (s.used_size_mb / s.max_size_mb > 0.9) w = 0
    w += Math.floor(free * 2)
    totalWeight += w
    pool.push({ shard: s, w })
  }

  // 4. 加权随机选中分片
  let rnd = Math.random() * totalWeight
  for (const item of pool) {
    rnd -= item.w
    if (rnd <= 0) return item.shard
  }
  return pool[0].shard
}

// ========== MySQL缓存工具（替代KV，读写system_cache表） ==========
export async function getCache(indexPool: Hyperdrive, key: string) {
  const metaDbItem = await getDbByPurpose(indexPool, "博客0数据库索引")
  const metaHD = createDynamicHyperdrive(metaDbItem)
  const now = Math.floor(Date.now() / 1000)
  const res = await runSQL(metaHD, `
    SELECT cache_value FROM system_cache WHERE cache_key = ? AND expire_ts > ?
  `, [key, now])
  if (res.rows.length === 0) return null
  return JSON.parse(res.rows[0].cache_value)
}

export async function setCache(indexPool: Hyperdrive, key: string, data: any, ttlSec: number) {
  const metaDbItem = await getDbByPurpose(indexPool, "博客0数据库索引")
  const metaHD = createDynamicHyperdrive(metaDbItem)
  const now = Math.floor(Date.now() / 1000)
  const expire = now + ttlSec
  const val = JSON.stringify(data)
  await runSQL(metaHD, `
    INSERT INTO system_cache(cache_key, cache_value, expire_ts)
    VALUES (?,?,?) ON DUPLICATE KEY UPDATE cache_value=?, expire_ts=?
  `, [key, val, expire, val, expire])
}

// 定时清理过期缓存、过期验证码
export async function cleanExpiredAll(indexPool: Hyperdrive) {
  const metaDbItem = await getDbByPurpose(indexPool, "博客0数据库索引")
  const metaHD = createDynamicHyperdrive(metaDbItem)
  const now = Math.floor(Date.now() / 1000)
  await runSQL(metaHD, `DELETE FROM system_cache WHERE expire_ts < ?`, [now])
  await runSQL(metaHD, `DELETE FROM captcha_store WHERE expire_unix < ?`, [now])
}