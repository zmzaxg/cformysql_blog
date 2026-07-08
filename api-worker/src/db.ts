import type { DbListItem } from "./types"

// 只读查询主索引库 zmzaxgIndex（唯一Hyperdrive）
export async function queryIndexDB(indexPool: Hyperdrive, sql: string, params: any[] = []) {
  const stmt = indexPool.prepare(sql)
  params.forEach((p, i) => stmt.bind(i + 1, p))
  const result = await stmt.run()
  return result
}

// 根据db_list行数据动态创建任意MySQL连接（zmzaxgblog0 / blog0to* 分片库）
export function createDynamicHyperdrive(item: DbListItem): Hyperdrive {
  return new Hyperdrive({
    host: item.db_host,
    port: item.db_port,
    user: item.db_user,
    password: item.db_pass,
    database: item.db_name
  })
}

// 通用SQL执行封装，任意Hyperdrive实例通用
export async function runSQL(hd: Hyperdrive, sql: string, params: any[] = []) {
  const stmt = hd.prepare(sql)
  params.forEach((p, i) => stmt.bind(i + 1, p))
  const res = await stmt.run()
  return res
}

// 根据purpose字段匹配数据库行
export async function getDbByPurpose(indexPool: Hyperdrive, targetPurpose: string): Promise<DbListItem> {
  const res = await queryIndexDB(indexPool, `SELECT * FROM db_list WHERE purpose = ? LIMIT 1`, [targetPurpose])
  if (res.rows.length === 0) throw new Error(`数据库【${targetPurpose}】未在db_list找到`)
  return res.rows[0] as DbListItem
}

// 根据db_list主键ID获取库信息
export async function getDbById(indexPool: Hyperdrive, dbId: number): Promise<DbListItem> {
  const res = await queryIndexDB(indexPool, `SELECT * FROM db_list WHERE id = ? LIMIT 1`, [dbId])
  if (res.rows.length === 0) throw new Error(`db_list id:${dbId} 不存在`)
  return res.rows[0] as DbListItem
}