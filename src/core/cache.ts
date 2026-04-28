/**
 * 轻量级内存缓存，支持 TTL 过期
 */
interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

/**
 * 默认缓存 TTL: 5 分钟
 */
const DEFAULT_TTL_MS = 5 * 60 * 1000

/**
 * 获取缓存数据，过期则返回 undefined
 */
export function getCache<T>(key: string): T | undefined {
  const entry = cache.get(key)
  if (!entry)
    return undefined
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return undefined
  }
  return entry.data as T
}

/**
 * 设置缓存数据
 */
export function setCache<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  })
}

/**
 * 带缓存的异步数据获取
 * 如果缓存命中直接返回，否则执行 fetcher 并缓存结果
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T> {
  const cached = getCache<T>(key)
  if (cached !== undefined)
    return cached

  const data = await fetcher()
  setCache(key, data, ttlMs)
  return data
}
