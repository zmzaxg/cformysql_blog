export type UserRole = "super_admin" | "admin" | "normal_user"

export interface GlobalUser {
  uid: number
  username: string
  password_hash: string
  email: string | null
  role: UserRole
  status: number
}

export interface DbListItem {
  id: number
  db_host: string
  db_port: number
  db_user: string
  db_pass: string
  db_name: string
  max_size_mb: number
  used_size_mb: number
  purpose: string
  uid_owner: number
  status: number
}

export interface ShardWeightCfg {
  db_list_row_id: number
  write_weight: number
  is_enable: number
}

export interface BlogShardRecord {
  route_id: number
  post_global_id: string
  owner_uid: number
  db_list_row_id: number
  post_local_id: number
}

export interface StorageStat {
  total: number
  used: number
  free: number
  warn: boolean
}

export interface SystemCacheItem {
  cache_key: string
  cache_value: string
  expire_ts: number
}