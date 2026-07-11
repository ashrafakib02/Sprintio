# Sprintio — Caching Architecture

---

| Field         | Value                                                                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Document Type | Caching Architecture                                                                                                                                              |
| Product       | Sprintio — Sprint fast. Ship together.                                                                                                                            |
| Version       | 1.0                                                                                                                                                               |
| Status        | Finalized                                                                                                                                                         |
| Date          | 2026-07-08                                                                                                                                                        |
| Author        | Engineering Team                                                                                                                                                  |
| Related Docs  | [Backend Architecture](02-BACKEND.md), [Frontend Architecture](01-FRONTEND.md), [NFRs](../NON_FUNCTIONAL_REQUIREMENTS.md), [MVP Definition](../MVP_DEFINITION.md) |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Redis Architecture](#2-redis-architecture)
3. [Cache Layers — L1 / L2 / L3](#3-cache-layers--l1--l2--l3)
4. [Cache Strategies](#4-cache-strategies)
5. [Key Schema](#5-key-schema)
6. [TTL Strategy](#6-ttl-strategy)
7. [Cache Invalidation](#7-cache-invalidation)
8. [Session Management](#8-session-management)
9. [Rate Limiting](#9-rate-limiting)
10. [Frontend Caching (TanStack Query)](#10-frontend-caching-tanstack-query)
11. [CDN Caching (Cloudflare)](#11-cdn-caching-cloudflare)
12. [Monitoring & Observability](#12-monitoring--observability)
13. [Anti-Patterns & Protection](#13-anti-patterns--protection)
14. [Quick Reference Cheat Sheet](#14-quick-reference-cheat-sheet)

---

## 1. Executive Summary

This document defines the complete caching architecture for Sprintio — how data is cached at every layer of the stack, how keys are named and expired, how invalidation propagates, and how the system stays consistent under concurrent writes.

Sprintio operates a **three-tier cache hierarchy**: L1 (in-process Node.js memory), L2 (Redis 7), and L3 (Cloudflare CDN edge). Each tier serves a distinct purpose with different trade-offs around latency, consistency, and cost.

### Design Principles

| #   | Principle                                              | Application                                                                                                                                          |
| --- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Cache is a performance optimization, not a feature** | Every cached value has a clear origin. If Redis dies, the system degrades gracefully to database reads — never to stale data served as truth.        |
| 2   | **Keys have owners**                                   | Every Redis key belongs to a domain module. Only that module writes, invalidates, and reads its keys. No cross-module key access.                    |
| 3   | **TTL is the safety net**                              | Every key has a maximum TTL, even if invalidation is expected. The TTL is the backstop for missed invalidation events.                               |
| 4   | **Invalidation is event-driven**                       | Cache invalidation flows through the same event bus that powers real-time sync. If you can see a change in the UI, the cache is already invalidated. |
| 5   | **Fail open**                                          | Redis timeouts fall through to the database. A cold cache is faster than a broken cache.                                                             |
| 6   | **Measure everything**                                 | Every cache operation is instrumented. Hit rate, miss rate, eviction rate, and latency are always observable.                                        |

### Cache Domain Coverage

| Domain              | Cache Layer | Strategy                  | Priority                |
| ------------------- | ----------- | ------------------------- | ----------------------- |
| Session store       | L2 (Redis)  | Write-through             | P0 — Auth depends on it |
| API response cache  | L1 + L2     | Cache-aside with TTL      | P0 — Dashboard latency  |
| Permission cache    | L1 + L2     | Write-through + TTL       | P0 — Security gate      |
| Rate limiting       | L2 (Redis)  | Sliding window            | P0 — Abuse prevention   |
| Real-time presence  | L2 (Redis)  | Write-behind (ephemeral)  | P1 — Online status      |
| Search suggestions  | L2 (Redis)  | Write-through             | P1 — Autocomplete UX    |
| Feature flags       | L1 + L2     | Cache-aside + pub/sub     | P1 — Feature gating     |
| Leaderboard / stats | L2 (Redis)  | Write-behind              | P2 — Non-critical       |
| AI response cache   | L2 (Redis)  | Cache-aside with hash key | P2 — Cost optimization  |
| Static assets       | L3 (CDN)    | Immutable + cache-bust    | P0 — Cold load          |

---

## 2. Redis Architecture

### 2.1 Topology

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        REDIS ARCHITECTURE                                │
│                                                                         │
│  ┌─────────────────────┐       ┌─────────────────────────────────────┐  │
│  │   DEVELOPMENT        │       │   PRODUCTION (Cluster Mode)         │  │
│  │                      │       │                                     │  │
│  │  ┌──────────────┐   │       │  ┌──────────┐  ┌──────────────┐   │  │
│  │  │  Redis 7     │   │       │  │  Shard 0  │  │   Shard 1    │   │  │
│  │  │  Single Node │   │       │  │  Master   │  │   Master     │   │  │
│  │  │  :6379       │   │       │  │  + Replica│  │   + Replica  │   │  │
│  │  │  256MB max   │   │       │  └──────────┘  └──────────────┘   │  │
│  │  └──────────────┘   │       │                                     │  │
│  │                      │       │  ┌──────────┐  ┌──────────────┐   │  │
│  │  Data: volatile      │       │  │  Shard 2  │  │   Shard 3    │   │  │
│  │  Persistence: none   │       │  │  Master   │  │   Master     │   │  │
│  │  Restart: acceptable │       │  │  + Replica│  │   + Replica  │   │  │
│  │                      │       │  └──────────┘  └──────────────┘   │  │
│  └─────────────────────┘       │                                     │  │
│                                │  Data: persistent (AOF + RDB)       │  │
│                                │  Persistence: AOF everysec + RDB   │  │
│                                │  maxmemory: 8GB per shard           │  │
│                                │  maxmemory-policy: allkeys-lru      │  │
│                                └─────────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    SENTINEL (Optional for non-Cluster HA)        │    │
│  │  3 Sentinels monitor master + replicas                          │    │
│  │  Automatic failover on master unreachable (>5s down-after)      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Configuration

```typescript
// src/lib/redis.ts
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

// ─── Development: Single Instance ────────────────────────────────
function createDevRedis(): Redis {
  return new Redis({
    host: config.REDIS_HOST || '127.0.0.1',
    port: Number(config.REDIS_PORT) || 6379,
    password: config.REDIS_PASSWORD || undefined,
    db: 0,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 3000);
      logger.warn(`Redis reconnecting in ${delay}ms (attempt ${times})`);
      return delay;
    },
    lazyConnect: true,
    enableReadyCheck: true,
  });
}

// ─── Production: Cluster Mode ────────────────────────────────────
function createProdRedis(): Redis.Cluster {
  const nodes = config.REDIS_CLUSTER_NODES
    ? config.REDIS_CLUSTER_NODES.split(',').map((addr) => {
        const [host, port] = addr.split(':');
        return { host, port: Number(port) || 6379 };
      })
    : [{ host: 'redis-0.sprintio.internal', port: 6379 }];

  return new Redis.Cluster(nodes, {
    redisOptions: {
      password: config.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 500, 10_000);
        return delay;
      },
      lazyConnect: true,
      enableReadyCheck: true,
      connectTimeout: 10_000,
      commandTimeout: 5_000,
    },
    scaleReads: 'slave', // Read from replicas, write to master
    clusterRetryStrategy(times) {
      return Math.min(times * 1000, 30_000);
    },
    enableOfflineQueue: true, // Queue commands during reconnection
    slotsRefreshTimeout: 2000,
    slotsRefreshInterval: 15_000,
  });
}

// ─── Export singleton ────────────────────────────────────────────
let redisClient: Redis | Redis.Cluster;

export async function initializeRedis(): Promise<Redis | Redis.Cluster> {
  redisClient = config.NODE_ENV === 'production' ? createProdRedis() : createDevRedis();

  await redisClient.connect();

  redisClient.on('error', (err) => {
    logger.error('Redis error', { error: err.message });
  });

  redisClient.on('connect', () => {
    logger.info('Redis connected', { mode: config.NODE_ENV });
  });

  return redisClient;
}

export function getRedis(): Redis | Redis.Cluster {
  return redisClient;
}
```

### 2.3 Cluster Slot Mapping

| Slot Range      | Domain                   | Rationale                                       |
| --------------- | ------------------------ | ----------------------------------------------- |
| `0 – 4095`      | `session`                | Auth-critical, isolated failover                |
| `4096 – 8191`   | `permission`             | Security-critical, frequent reads               |
| `8192 – 12287`  | `cache`                  | General API cache, high write volume            |
| `12288 – 16383` | `presence` + `ratelimit` | Ephemeral + counters, co-located for efficiency |

> **Note**: Redis Cluster auto-assigns hash slots. The table above shows the _intended_ key distribution. Actual slot assignment depends on the key hash. Use Redis `CLUSTER KEYSLOT` to verify.

---

## 3. Cache Layers — L1 / L2 / L3

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          REQUEST FLOW THROUGH CACHE LAYERS                  │
│                                                                             │
│  Browser                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  L3: CDN (Cloudflare Edge)                                          │    │
│  │  ┌───────────────────────────────────────────────────────────────┐  │    │
│  │  │ Static assets (immutable): JS, CSS, images                   │  │    │
│  │  │ API cache: GET /dashboards, GET /projects (cache-control)     │  │    │
│  │  │ TTL: 1h – 30d depending on content type                      │  │    │
│  │  │ Miss ──────────────────────────────────────────────────────►  │  │    │
│  │  └───────────────────────────────────────────────────────────────┘  │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  Node.js Server                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  L1: In-Process Memory (Map / LRU)                                  │    │
│  │  ┌───────────────────────────────────────────────────────────────┐  │    │
│  │  │ Feature flags (5s TTL)                                        │  │    │
│  │  │ Permission sets (30s TTL)                                     │  │    │
│  │  │ User profile summary (10s TTL)                                │  │    │
│  │  │ Workspace config (60s TTL)                                    │  │    │
│  │  │ Miss ──────────────────────────────────────────────────────►  │  │    │
│  │  └───────────────────────────────────────────────────────────────┘  │    │
│  │                                                                     │    │
│  │  L2: Redis Cluster                                                  │    │
│  │  ┌───────────────────────────────────────────────────────────────┐  │    │
│  │  │ Session store, API cache, rate limits, presence               │  │    │
│  │  │ AI response cache, search suggestions, leaderboards           │  │    │
│  │  │ TTL: 5s – 24h depending on domain                             │  │    │
│  │  │ Miss ──────────────────────────────────────────────────────►  │  │    │
│  │  └───────────────────────────────────────────────────────────────┘  │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  PostgreSQL 16 (Source of Truth)                                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 L1 — In-Process Memory

| Property     | Value                                                             |
| ------------ | ----------------------------------------------------------------- |
| Technology   | `Map<string, {value, expiresAt}>` with LRU eviction               |
| Max size     | 1,000 entries per process                                         |
| Scope        | Per-Node.js process (not shared across pods)                      |
| Invalidation | On write, broadcast invalidation via Redis Pub/Sub                |
| Use case     | Ultra-hot data: feature flags, user permissions, workspace config |

```typescript
// src/lib/l1-cache.ts
interface L1Entry<T> {
  value: T;
  expiresAt: number;
}

export class L1Cache<T = unknown> {
  private store = new Map<string, L1Entry<T>>();
  private readonly maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;

    // Evict expired entries every 60s
    setInterval(() => this.evictExpired(), 60_000).unref();
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    // LRU: delete + re-insert puts it at "newest" position
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxSize) {
      // Evict oldest (first entry)
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    for (const key of this.store.keys()) {
      if (regex.test(key)) this.store.delete(key);
    }
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }

  get size(): number {
    return this.store.size;
  }
}

// Singleton per domain
export const l1FeatureFlags = new L1Cache<boolean>(200);
export const l1Permissions = new L1Cache<Set<string>>(500);
export const l1UserProfile = new L1Cache<UserSummary>(300);
export const l1WorkspaceConfig = new L1Cache<WorkspaceConfig>(200);
```

### 3.2 L2 — Redis

| Property        | Value                              |
| --------------- | ---------------------------------- |
| Technology      | Redis 7 (single dev, cluster prod) |
| Network latency | ~1ms same-AZ, ~2ms cross-AZ        |
| Max memory      | 8GB per shard (production)         |
| Eviction        | `allkeys-lru`                      |
| Persistence     | AOF (everysec) + RDB snapshots     |
| Use case        | All shared server-side state       |

### 3.3 L3 — Cloudflare CDN

| Property        | Value                                  |
| --------------- | -------------------------------------- |
| Technology      | Cloudflare CDN / Cache API             |
| Edge locations  | 300+ global PoPs                       |
| Network latency | <10ms (edge), 0ms (cache hit)          |
| TTL range       | Immutable assets: 30d, API: 5min–1h    |
| Use case        | Static assets, cacheable API responses |

---

## 4. Cache Strategies

### 4.1 Strategy Selection Matrix

```
┌────────────────────┬──────────────┬─────────────┬───────────────┬──────────────┐
│ Strategy           │ Consistency  │ Write Cost  │ Read Cost     │ Used For     │
├────────────────────┼──────────────┼─────────────┼───────────────┼──────────────┤
│ Cache-aside        │ Eventual     │ 1 DB + 1    │ 1 Redis + 1   │ API cache,   │
│                    │              │ Redis write │ DB (on miss)  │ profiles     │
├────────────────────┼──────────────┼─────────────┼───────────────┼──────────────┤
│ Write-through      │ Strong       │ 2 writes    │ 1 Redis read  │ Sessions,    │
│                    │              │ (DB+cache)  │ (usually hit) │ permissions  │
├────────────────────┼──────────────┼─────────────┼───────────────┼──────────────┤
│ Write-behind       │ Eventual     │ 1 Redis     │ 1 Redis read  │ Presence,    │
│                    │              │ write       │ (always hit)  │ stats        │
├────────────────────┼──────────────┼─────────────┼───────────────┼──────────────┤
│ Read-through       │ Strong       │ 1 Redis     │ 1 Redis read  │ Feature      │
│                    │              │ write       │ (auto-load)   │ flags        │
└────────────────────┴──────────────┴─────────────┴───────────────┴──────────────┘
```

### 4.2 Cache-Aside (Lazy Loading)

**Used for**: API response cache, AI response cache, search suggestions

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CACHE-ASIDE PATTERN                             │
│                                                                     │
│  Request                                                            │
│    │                                                                │
│    ▼                                                                │
│  ┌──────────┐     HIT      ┌─────────┐                              │
│  │  L1/L2   │────────────►│ Return  │                               │
│  │  Cache   │             │ Cached  │                               │
│  └────┬─────┘             │ Value   │                               │
│       │ MISS              └─────────┘                               │
│       ▼                                                             │
│  ┌──────────┐     FAIL     ┌─────────┐                              │
│  │ Database │────────────►│ Return  │                               │
│  │  Query   │             │  Error  │                               │
│  └────┬─────┘             └─────────┘                               │
│       │ OK                                                          │
│       ▼                                                             │
│  ┌──────────┐                                                       │
│  │ Populate │  Write to L1 (if hot) + L2 (always)                   │
│  │  Cache   │  Set TTL                                              │
│  └──────────┘                                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

```typescript
// src/lib/cache-aside.ts
import type { Redis } from 'ioredis';
import type { L1Cache } from './l1-cache';
import { getRedis } from './redis';
import { logger } from './logger';

interface CacheAsideOptions<T> {
  /** Redis key */
  key: string;
  /** TTL in seconds for L2 (Redis) */
  ttl: number;
  /** TTL in ms for L1 (in-process) — 0 to skip L1 */
  l1TtlMs?: number;
  /** L1 cache instance to use */
  l1Cache?: L1Cache<T>;
  /** Function to fetch from DB on cache miss */
  fetchFn: () => Promise<T>;
  /** Optional serializer for Redis storage */
  serialize?: (value: T) => string;
  /** Optional deserializer from Redis */
  deserialize?: (raw: string) => T;
  /** Prefix for cache-aside namespace */
  namespace?: string;
}

export async function cacheAside<T>(opts: CacheAsideOptions<T>): Promise<T> {
  const {
    key,
    ttl,
    l1TtlMs = 0,
    l1Cache,
    fetchFn,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = opts;

  const redis = getRedis();

  // ── L1 Check ──────────────────────────────────────────────
  if (l1TtlMs > 0 && l1Cache) {
    const l1Hit = l1Cache.get(key);
    if (l1Hit !== undefined) {
      return l1Hit;
    }
  }

  // ── L2 (Redis) Check ──────────────────────────────────────
  try {
    const raw = await redis.get(key);
    if (raw !== null) {
      const value = deserialize(raw);

      // Populate L1 if configured
      if (l1TtlMs > 0 && l1Cache) {
        l1Cache.set(key, value, l1TtlMs);
      }

      return value;
    }
  } catch (err) {
    // Redis unavailable — fall through to DB
    logger.warn('Redis L2 miss (connection issue)', { key, error: (err as Error).message });
  }

  // ── Cache Miss → Fetch from DB ────────────────────────────
  const value = await fetchFn();

  // ── Populate both layers ──────────────────────────────────
  try {
    await redis.setex(key, ttl, serialize(value));
  } catch (err) {
    logger.warn('Redis write failed', { key, error: (err as Error).message });
  }

  if (l1TtlMs > 0 && l1Cache) {
    l1Cache.set(key, value, l1TtlMs);
  }

  return value;
}
```

### 4.3 Write-Through

**Used for**: Session store, permission cache, user profile updates

```typescript
// src/lib/cache-write-through.ts
import type { Redis } from 'ioredis';
import { getRedis } from './redis';
import { logger } from './logger';
import { eventBus } from './event-bus';

interface WriteThroughOptions<T> {
  /** Redis key */
  key: string;
  /** TTL in seconds */
  ttl: number;
  /** Write to database and return the persisted value */
  writeFn: (value: T) => Promise<T>;
  /** Serialize for Redis */
  serialize?: (value: T) => string;
}

/**
 * Write-through: write to DB first, then update cache.
 * If DB write fails, cache is not touched.
 * On success, cache is updated and invalidation event is published.
 */
export async function writeThrough<T>(opts: WriteThroughOptions<T>, value: T): Promise<T> {
  const { key, ttl, writeFn, serialize = JSON.stringify } = opts;
  const redis = getRedis();

  // 1. Write to database (source of truth)
  const persisted = await writeFn(value);

  // 2. Update cache (best-effort)
  try {
    await redis.setex(key, ttl, serialize(persisted));
  } catch (err) {
    logger.warn('Cache write-through failed', { key, error: (err as Error).message });
  }

  // 3. Broadcast invalidation for L1 caches across all pods
  eventBus.publish('cache:invalidate', { key });

  return persisted;
}
```

### 4.4 Write-Behind (Write-Back)

**Used for**: Presence data, activity stats, leaderboards

```typescript
// src/lib/cache-write-behind.ts
import type { Redis } from 'ioredis';
import { getRedis } from './redis';
import { logger } from './logger';

/**
 * Write-behind: write to Redis immediately, flush to DB asynchronously.
 * Used for ephemeral/high-frequency data where occasional data loss is acceptable.
 * Example: cursor positions, typing indicators, view counters.
 */
export class WriteBehindBuffer<T> {
  private buffer = new Map<string, T>();
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly flushIntervalMs: number,
    private readonly flushFn: (entries: Map<string, T>) => Promise<void>,
  ) {}

  /** Write to buffer — will be flushed to DB asynchronously */
  write(key: string, value: T): void {
    this.buffer.set(key, value);
  }

  /** Start automatic flushing */
  start(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
    this.flushTimer.unref();
  }

  /** Manual flush — called on graceful shutdown */
  async flush(): Promise<void> {
    if (this.buffer.size === 0) return;

    const snapshot = new Map(this.buffer);
    this.buffer.clear();

    try {
      await this.flushFn(snapshot);
    } catch (err) {
      logger.error('Write-behind flush failed', {
        count: snapshot.size,
        error: (err as Error).message,
      });
      // Re-queue failed entries (simplified: add back to buffer)
      for (const [key, value] of snapshot) {
        this.buffer.set(key, value);
      }
    }
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  get pendingCount(): number {
    return this.buffer.size;
  }
}

// Usage: Activity stats write-behind
const activityBuffer = new WriteBehindBuffer(
  5_000, // Flush every 5s
  async (entries) => {
    const redis = getRedis();
    const pipeline = redis.pipeline();
    for (const [key, value] of entries) {
      const ttl = 3600; // 1 hour TTL
      pipeline.setex(key, ttl, JSON.stringify(value));
    }
    await pipeline.exec();
  },
);
```

---

## 5. Key Schema

### 5.1 Naming Convention

```
{domain}:{workspace_id}:{entity}:{entity_id}:{sub_entity}
```

| Segment        | Description                                    | Examples                                                                    |
| -------------- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| `domain`       | Cache namespace — the module that owns the key | `session`, `perm`, `cache`, `rl`, `presence`, `search`, `ff`, `stats`, `ai` |
| `workspace_id` | Workspace scope (or `*` for global keys)       | `ws_abc123`, `*`                                                            |
| `entity`       | Data type                                      | `user`, `project`, `task`, `dashboard`, `doc`                               |
| `entity_id`    | Unique identifier                              | `usr_xyz`, `prj_456`                                                        |
| `sub_entity`   | Sub-resource (optional)                        | `comments`, `members`, `stats`                                              |

### 5.2 Complete Key Schema

| Domain           | Key Pattern                             | Example                            | Value Type            | TTL              |
| ---------------- | --------------------------------------- | ---------------------------------- | --------------------- | ---------------- |
| **Session**      | `session:{user_id}`                     | `session:usr_xyz`                  | Hash (session data)   | 7d               |
| **Session**      | `session:refresh:{user_id}`             | `session:refresh:usr_xyz`          | String (token)        | 30d              |
| **Permission**   | `perm:{workspace_id}:user:{user_id}`    | `perm:ws_abc:user:usr_xyz`         | Set (roles)           | 30s L1 / 5min L2 |
| **Permission**   | `perm:{workspace_id}:roles`             | `perm:ws_abc:roles`                | Hash (role→perms)     | 5min             |
| **Permission**   | `perm:{workspace_id}:admin:{user_id}`   | `perm:ws_abc:admin:usr_xyz`        | String (`0`/`1`)      | 30s              |
| **Cache**        | `cache:{ws_id}:dashboard:{dash_id}`     | `cache:ws_abc:dash:dsh_123`        | JSON (stats)          | 60s              |
| **Cache**        | `cache:{ws_id}:projects:list`           | `cache:ws_abc:projects:list`       | JSON (array)          | 120s             |
| **Cache**        | `cache:{ws_id}:project:{proj_id}`       | `cache:ws_abc:project:prj_456`     | JSON (project)        | 60s              |
| **Cache**        | `cache:{ws_id}:user:{user_id}`          | `cache:ws_abc:user:usr_xyz`        | JSON (profile)        | 120s             |
| **Cache**        | `cache:{ws_id}:task:{task_id}`          | `cache:ws_abc:task:tsk_789`        | JSON (task)           | 30s              |
| **Rate Limit**   | `rl:{scope}:{identifier}:{window}`      | `rl:api:usr_xyz:1688822400`        | String (count)        | 1 min            |
| **Rate Limit**   | `rl:sliding:{scope}:{id}`               | `rl:sliding:api:usr_xyz`           | Sorted Set            | 1 min            |
| **Presence**     | `presence:{ws_id}:online`               | `presence:ws_abc:online`           | Set (user IDs)        | No TTL           |
| **Presence**     | `presence:{ws_id}:user:{user_id}`       | `presence:ws_abc:user:usr_xyz`     | Hash (status, cursor) | 30s              |
| **Presence**     | `presence:{ws_id}:doc:{doc_id}:cursors` | `presence:ws_abc:doc:d_1:cursors`  | Hash (user→cursor)    | 10s              |
| **Presence**     | `presence:{ws_id}:typing:{task_id}`     | `presence:ws_abc:typing:tsk_1`     | Set (user IDs)        | 5s               |
| **Search**       | `search:{ws_id}:recent:{user_id}`       | `search:ws_abc:recent:usr_xyz`     | List (queries)        | 24h              |
| **Search**       | `search:{ws_id}:suggest:{prefix}`       | `search:ws_abc:suggest:pro`        | Sorted Set            | 1h               |
| **Feature Flag** | `ff:workspace:{ws_id}`                  | `ff:workspace:ws_abc`              | Hash (flag→value)     | 60s              |
| **Feature Flag** | `ff:user:{user_id}`                     | `ff:user:usr_xyz`                  | Hash (overrides)      | 60s              |
| **Stats**        | `stats:{ws_id}:tasks:count`             | `stats:ws_abc:tasks:count`         | Hash (by status)      | 120s             |
| **Stats**        | `stats:{ws_id}:leaderboard:{period}`    | `stats:ws_abc:leaderboard:weekly`  | Sorted Set            | 300s             |
| **Stats**        | `stats:{ws_id}:activity:{date}`         | `stats:ws_abc:activity:2026-07-08` | Hash (metrics)        | 24h              |
| **AI Cache**     | `ai:{ws_id}:prompt:{hash}`              | `ai:ws_abc:prompt:a1b2c3`          | JSON (response)       | 1h               |
| **Pub/Sub**      | `pubsub:{ws_id}:invalidate`             | `pubsub:ws_abc:invalidate`         | Channel               | N/A              |
| **Pub/Sub**      | `pubsub:presence`                       | `pubsub:presence`                  | Channel               | N/A              |
| **Pub/Sub**      | `pubsub:flags`                          | `pubsub:flags`                     | Channel               | N/A              |

### 5.3 Key Validation

```typescript
// src/lib/redis-keys.ts

const KEY_PATTERNS = {
  session: /^session:[a-zA-Z0-9_-]+$/,
  sessionRefresh: /^session:refresh:[a-zA-Z0-9_-]+$/,
  permission: /^perm:[a-zA-Z0-9_-]+:(user|roles|admin):[a-zA-Z0-9_-]*$/,
  cache: /^cache:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/,
  rateLimit: /^rl:(api|auth|ai|webhook):[a-zA-Z0-9_-]+:[0-9]+$/,
  presence: /^presence:[a-zA-Z0-9_-]+:(online|user|typing|doc):[a-zA-Z0-9_-]*$/,
  featureFlag: /^ff:(workspace|user):[a-zA-Z0-9_-]+$/,
  stats: /^stats:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+(:[a-zA-Z0-9_-]+)?$/,
  aiCache: /^ai:[a-zA-Z0-9_-]+:prompt:[a-f0-9]+$/,
} as const;

type Domain = keyof typeof KEY_PATTERNS;

/** Validate key format in development; skip in production for performance */
export function validateKey(domain: Domain, key: string): void {
  if (process.env.NODE_ENV !== 'production') {
    if (!KEY_PATTERNS[domain].test(key)) {
      throw new Error(
        `Invalid Redis key for domain "${domain}": "${key}" — ` +
          `must match pattern: ${KEY_PATTERNS[domain].source}`,
      );
    }
  }
}

/** Build a namespaced key with validation */
export function redisKey(domain: Domain, ...parts: (string | number)[]): string {
  const key = `${domain}:${parts.join(':')}`;
  validateKey(domain, key);
  return key;
}
```

---

## 6. TTL Strategy

### 6.1 Per-Domain TTL Table

| Domain                     | L1 TTL | L2 TTL                     | Stale-While-Revalidate | Rationale                    |
| -------------------------- | ------ | -------------------------- | ---------------------- | ---------------------------- |
| **Session**                | N/A    | 7 days                     | No                     | Auth session lifetime        |
| **Refresh Token**          | N/A    | 30 days                    | No                     | Rotation on use              |
| **Permissions**            | 30s    | 5 min                      | No                     | Security-critical; short TTL |
| **Dashboard Stats**        | 10s    | 60s                        | Yes (10s)              | High read, moderate write    |
| **Project List**           | 15s    | 120s                       | Yes (15s)              | Stable data, frequently read |
| **Project Detail**         | 10s    | 60s                        | Yes (10s)              | Moderate change frequency    |
| **User Profile**           | 10s    | 120s                       | Yes (10s)              | Rarely changes               |
| **Task Detail**            | 5s     | 30s                        | Yes (5s)               | Frequently updated           |
| **Rate Limit Window**      | N/A    | 60s (fixed) / 1m (sliding) | No                     | Counter must be exact        |
| **Presence (online set)**  | N/A    | No TTL (keyspace notify)   | N/A                    | Updated every heartbeat      |
| **Presence (user status)** | N/A    | 30s                        | N/A                    | Heartbeat refreshes          |
| **Typing Indicator**       | N/A    | 5s                         | N/A                    | Ephemeral                    |
| **Cursor Position**        | N/A    | 10s                        | N/A                    | High-frequency update        |
| **Search Suggestions**     | N/A    | 1h                         | No                     | Computed from index          |
| **Recent Searches**        | N/A    | 24h                        | No                     | User preference data         |
| **Feature Flags**          | 5s     | 60s                        | No                     | Must reflect changes fast    |
| **Workspace Config**       | 60s    | 5 min                      | Yes (60s)              | Rarely changes               |
| **Task Counts/Stats**      | N/A    | 120s                       | Yes (30s)              | Approximate is acceptable    |
| **Leaderboard**            | N/A    | 300s                       | Yes (30s)              | Cosmetic; stale is fine      |
| **AI Response**            | N/A    | 1 hour                     | No                     | Expensive to regenerate      |

### 6.2 Stale-While-Revalidate (SWR) Pattern

SWR serves stale data immediately while refreshing in the background. This eliminates perceived latency for the user.

```
┌─────────────────────────────────────────────────────────────────────┐
│                  STALE-WHILE-REVALIDATE FLOW                        │
│                                                                     │
│  Request arrives                                                    │
│    │                                                                │
│    ▼                                                                │
│  ┌──────────────────┐                                               │
│  │ Cache contains   │                                               │
│  │ data & TTL?      │                                               │
│  └────┬─────────────┘                                               │
│       │                                                             │
│  ┌────┴──────────────┐                                              │
│  │                    │                                             │
│  ▼                    ▼                                             │
│  FRESH              STALE (past TTL but within SWR window)          │
│  ┌────────┐         ┌────────────────────────────────┐              │
│  │ Return │         │ Return STALE data immediately   │              │
│  │ cached │         │ (user sees data instantly)      │              │
│  │ data   │         │                                │              │
│  └────────┘         │ Trigger background revalidation│              │
│                     │ ┌──────────────────────────┐   │              │
│                     │ │ Fetch from DB in background│  │              │
│                     │ │ Update cache when done     │  │              │
│                     │ └──────────────────────────┘   │              │
│                     └────────────────────────────────┘              │
│                                                                     │
│  EXPIRED (past TTL + SWR window)                                    │
│  ┌────────────────────────────────┐                                 │
│  │ Fetch from DB synchronously    │                                 │
│  │ Block request until complete   │                                 │
│  └────────────────────────────────┘                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

```typescript
// src/lib/cache-swr.ts
import type { Redis } from 'ioredis';
import { getRedis } from './redis';
import { logger } from './logger';

interface SWROptions<T> {
  key: string;
  /** Primary TTL in seconds (data is "fresh" before this) */
  ttl: number;
  /** SWR window in seconds — data is served stale but revalidated */
  swrWindow: number;
  fetchFn: () => Promise<T>;
  serialize?: (value: T) => string;
  deserialize?: (raw: string) => T;
}

interface SWRCacheEntry<T> {
  value: T;
  /** Timestamp when the entry was written */
  writtenAt: number;
}

export async function cacheSWR<T>(opts: SWROptions<T>): Promise<{ value: T; stale: boolean }> {
  const {
    key,
    ttl,
    swrWindow,
    fetchFn,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = opts;

  const redis = getRedis();
  const now = Math.floor(Date.now() / 1000);

  try {
    const raw = await redis.get(key);
    if (raw !== null) {
      const entry: SWRCacheEntry<T> = deserialize(raw);
      const age = now - entry.writtenAt;

      if (age < ttl) {
        // FRESH — return immediately
        return { value: entry.value, stale: false };
      }

      if (age < ttl + swrWindow) {
        // STALE but within SWR window — return stale, revalidate async
        revalidateInBackground(key, ttl, swrWindow, fetchFn, serialize);
        return { value: entry.value, stale: true };
      }
      // EXPIRED — fall through to sync fetch
    }
  } catch (err) {
    logger.warn('Redis SWR read failed', { key, error: (err as Error).message });
  }

  // EXPIRED or first-time: synchronous fetch
  const value = await fetchFn();
  const entry: SWRCacheEntry<T> = { value, writtenAt: now };

  try {
    // Total TTL = ttl + swrWindow (to keep the stale entry readable)
    await redis.setex(key, ttl + swrWindow, serialize(entry));
  } catch (err) {
    logger.warn('Redis SWR write failed', { key, error: (err as Error).message });
  }

  return { value, stale: false };
}

async function revalidateInBackground<T>(
  key: string,
  ttl: number,
  swrWindow: number,
  fetchFn: () => Promise<T>,
  serialize: (value: T) => string,
): Promise<void> {
  try {
    const value = await fetchFn();
    const entry: SWRCacheEntry<T> = { value, writtenAt: Math.floor(Date.now() / 1000) };
    const redis = getRedis();
    await redis.setex(key, ttl + swrWindow, serialize(entry));
  } catch (err) {
    logger.warn('SWR background revalidation failed', { key, error: (err as Error).message });
  }
}
```

### 6.3 TTL Jitter

To prevent thundering herd when many keys expire simultaneously, add random jitter to all TTLs.

```typescript
// src/lib/ttl.ts

/**
 * Apply random jitter to a TTL value.
 * @param baseTTL - Base TTL in seconds
 * @param jitterPercent - Percentage of TTL to use as jitter range (default 10%)
 * @returns TTL with jitter: [baseTTL, baseTTL + jitter]
 */
export function jitterTTL(baseTTL: number, jitterPercent = 0.1): number {
  const jitter = Math.floor(baseTTL * jitterPercent * Math.random());
  return baseTTL + jitter;
}

// Usage:
// const ttl = jitterTTL(60); // Returns 60–66 seconds
await redis.setex(key, jitterTTL(60), value);
```

---

## 7. Cache Invalidation

### 7.1 Invalidation Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CACHE INVALIDATION FLOW                                  │
│                                                                             │
│  User Action                                                                │
│    │                                                                        │
│    ▼                                                                        │
│  ┌──────────────────┐                                                       │
│  │ API Handler       │                                                      │
│  │ (write operation) │                                                      │
│  └────┬──────────────┘                                                       │
│       │                                                                      │
│       │ 1. Write to DB                                                       │
│       ▼                                                                      │
│  ┌──────────────────┐                                                       │
│  │ PostgreSQL        │                                                       │
│  │ (source of truth) │                                                       │
│  └────┬──────────────┘                                                       │
│       │                                                                      │
│       │ 2. Publish invalidation event                                        │
│       ▼                                                                      │
│  ┌──────────────────────────────────────────────────────────┐                │
│  │ Redis Pub/Sub Channel: pubsub:{ws_id}:invalidate         │                │
│  │                                                          │                │
│  │ Event: { type: 'task.updated', taskId: 'tsk_1',          │                │
│  │          keys: ['cache:ws:task:tsk_1',                   │                │
│  │                 'cache:ws:dashboard:dsh_1'] }            │                │
│  └───┬────────────────────┬─────────────────────────────────┘                │
│      │                    │                                                  │
│      ▼                    ▼                                                  │
│  ┌──────────────┐   ┌──────────────┐                                        │
│  │  Pod A       │   │  Pod B       │   (all pods receive the event)          │
│  │              │   │              │                                         │
│  │ 3a. Delete   │   │ 3b. Delete   │                                         │
│  │ L1 keys      │   │ L1 keys      │                                         │
│  │ 4a. Delete   │   │ 4b. Delete   │                                         │
│  │ L2 keys      │   │ L2 keys      │                                         │
│  └──────────────┘   └──────────────┘                                        │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────┐                │
│  │ WebSocket Broadcast (optional — for frontend invalidation)│                │
│  │                                                          │                │
│  │ 5. Send invalidation event to connected clients          │                │
│  │    → Client invalidates TanStack Query caches            │                │
│  └──────────────────────────────────────────────────────────┘                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Invalidation Event Types

| Event                  | Keys Invalidated                                                         | Scope     |
| ---------------------- | ------------------------------------------------------------------------ | --------- |
| `task.updated`         | `cache:{ws}:task:{id}`, `cache:{ws}:dashboard:*`                         | Workspace |
| `task.moved`           | `cache:{ws}:task:*`, `cache:{ws}:dashboard:*`                            | Workspace |
| `task.created`         | `cache:{ws}:project:{projId}:tasks`, `cache:{ws}:dashboard:*`            | Workspace |
| `task.deleted`         | `cache:{ws}:task:{id}`, `cache:{ws}:project:*`, `cache:{ws}:dashboard:*` | Workspace |
| `project.updated`      | `cache:{ws}:project:{id}`, `cache:{ws}:projects:list`                    | Workspace |
| `project.created`      | `cache:{ws}:projects:list`                                               | Workspace |
| `comment.added`        | `cache:{ws}:task:{taskId}:comments`                                      | Workspace |
| `member.joined`        | `perm:{ws}:*`, `cache:{ws}:project:*:members`                            | Workspace |
| `role.changed`         | `perm:{ws}:user:{userId}`, `perm:{ws}:admin:{userId}`                    | Workspace |
| `settings.updated`     | `cache:{ws}:config`                                                      | Workspace |
| `feature_flag.toggled` | `ff:workspace:{ws}`, `ff:user:*`                                         | Global    |
| `user.profile.updated` | `cache:*:user:{userId}`                                                  | Global    |

### 7.3 Invalidation Implementation

```typescript
// src/lib/cache-invalidation.ts
import type { Redis } from 'ioredis';
import { getRedis } from './redis';
import { l1FeatureFlags, l1Permissions, l1UserProfile } from './l1-cache';
import { logger } from './logger';

// ─── Invalidation Event Publisher ────────────────────────────────

interface InvalidationEvent {
  type: string;
  workspaceId: string;
  /** Explicit Redis key patterns to invalidate */
  keys: string[];
  /** Entity details for frontend invalidation */
  entity?: {
    type: string;
    id: string;
  };
}

export async function publishInvalidation(event: InvalidationEvent): Promise<void> {
  const redis = getRedis();
  const channel = `pubsub:${event.workspaceId}:invalidate`;

  try {
    await redis.publish(channel, JSON.stringify(event));
    logger.debug('Cache invalidation published', { type: event.type, keys: event.keys });
  } catch (err) {
    logger.error('Failed to publish cache invalidation', {
      type: event.type,
      error: (err as Error).message,
    });
  }
}

// ─── Invalidation Event Subscriber ───────────────────────────────

export function subscribeToInvalidation(workspaceId: string): void {
  const redis = getRedis();
  const channel = `pubsub:${workspaceId}:invalidate`;

  redis.subscribe(channel, (err) => {
    if (err) {
      logger.error('Failed to subscribe to invalidation channel', {
        channel,
        error: (err as Error).message,
      });
      return;
    }
    logger.info('Subscribed to invalidation channel', { channel });
  });

  redis.on('message', async (_ch, message) => {
    if (_ch !== channel) return;

    try {
      const event: InvalidationEvent = JSON.parse(message);
      await handleInvalidation(event);
    } catch (err) {
      logger.error('Failed to process invalidation event', { error: (err as Error).message });
    }
  });
}

async function handleInvalidation(event: InvalidationEvent): Promise<void> {
  const redis = getRedis();

  for (const keyPattern of event.keys) {
    // Check if the key contains wildcards
    if (keyPattern.includes('*')) {
      // Scan and delete matching keys
      const keys = await scanKeys(redis, keyPattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } else {
      await redis.del(keyPattern);
    }
  }

  // Invalidate L1 caches
  for (const keyPattern of event.keys) {
    l1Permissions.invalidatePattern(keyPattern);
    l1UserProfile.invalidatePattern(keyPattern);
    l1FeatureFlags.invalidatePattern(keyPattern);
  }
}

async function scanKeys(redis: Redis, pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';

  do {
    const [nextCursor, found] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    keys.push(...found);
  } while (cursor !== '0');

  return keys;
}
```

### 7.4 Domain-Specific Invalidation Helpers

```typescript
// src/modules/tasks/cache.ts
import { redisKey } from '../../lib/redis-keys';
import { cacheAside } from '../../lib/cache-aside';
import { writeThrough } from '../../lib/cache-write-through';
import { publishInvalidation } from '../../lib/cache-invalidation';
import { jitterTTL } from '../../lib/ttl';
import { db } from '../../lib/database';
import { tasks } from '../../db/schema';
import { eq } from 'drizzle-orm';

const TASK_TTL = 30; // seconds
const TASK_LIST_TTL = 120; // seconds

export async function getTask(taskId: string, workspaceId: string) {
  const key = redisKey('cache', workspaceId, 'task', taskId);

  return cacheAside({
    key,
    ttl: jitterTTL(TASK_TTL),
    l1TtlMs: 5_000,
    fetchFn: async () => {
      const result = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
      return result[0] ?? null;
    },
  });
}

export async function updateTask(
  taskId: string,
  workspaceId: string,
  data: Partial<typeof tasks.$inferInsert>,
) {
  const key = redisKey('cache', workspaceId, 'task', taskId);

  const updated = await writeThrough(
    {
      key,
      ttl: jitterTTL(TASK_TTL),
      writeFn: async (value) => {
        const result = await db.update(tasks).set(value).where(eq(tasks.id, taskId)).returning();
        return result[0];
      },
    },
    data as any,
  );

  // Publish invalidation for related caches
  await publishInvalidation({
    type: 'task.updated',
    workspaceId,
    keys: [
      key,
      redisKey('cache', workspaceId, 'dashboard', '*'),
      redisKey('cache', workspaceId, 'project', '*', 'tasks'),
    ],
    entity: { type: 'task', id: taskId },
  });

  return updated;
}
```

---

## 8. Session Management

### 8.1 Session Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SESSION FLOW                                      │
│                                                                     │
│  Login                                                              │
│    │                                                                │
│    ▼                                                                │
│  ┌────────────────────────────┐                                     │
│  │ 1. Verify credentials      │                                     │
│  │ 2. Generate JWT access     │  Stateless — verified via           │
│  │    token (15min expiry)    │  signature, no Redis lookup         │
│  │ 3. Generate session ID     │                                     │
│  │ 4. Store session in Redis  │  session:{user_id} → Hash           │
│  │ 5. Store refresh token     │  session:refresh:{user_id} → String │
│  │ 6. Set session cookie      │  HttpOnly, Secure, SameSite=Strict  │
│  └────────────────────────────┘                                     │
│                                                                     │
│  API Request (authenticated)                                        │
│    │                                                                │
│    ▼                                                                │
│  ┌────────────────────────────┐                                     │
│  │ 1. Validate JWT signature  │  No Redis call needed               │
│  │ 2. Check expiration        │                                     │
│  │ 3. (Optional) Check Redis  │  session:{user_id} — verify session │
│  │    for session validity    │  hasn't been revoked                │
│  └────────────────────────────┘                                     │
│                                                                     │
│  Token Refresh                                                      │
│    │                                                                │
│    ▼                                                                │
│  ┌────────────────────────────┐                                     │
│  │ 1. Validate refresh token  │  session:refresh:{user_id}          │
│  │    in Redis                │  Must match stored value            │
│  │ 2. Rotate: delete old,     │  Prevents refresh token replay     │
│  │    store new refresh token │                                     │
│  │ 3. Issue new access token  │                                     │
│  │ 4. Update session TTL      │  Extend session expiry              │
│  └────────────────────────────┘                                     │
│                                                                     │
│  Logout / Revoke                                                    │
│    │                                                                │
│    ▼                                                                │
│  ┌────────────────────────────┐                                     │
│  │ 1. DEL session:{user_id}   │  Immediately invalid                │
│  │ 2. DEL session:refresh:    │  Cannot refresh anymore             │
│  │    {user_id}               │                                     │
│  │ 3. Publish revoke event    │  Other pods clear L1 session cache  │
│  └────────────────────────────┘                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2 Session Configuration

| Parameter             | Value            | Rationale                             |
| --------------------- | ---------------- | ------------------------------------- |
| JWT Access Token TTL  | 15 minutes       | Short-lived, stateless verification   |
| JWT Refresh Token TTL | 30 days          | Long session for UX; revocable        |
| Redis Session TTL     | 30 days          | Matches refresh token                 |
| Session Rotation      | On every refresh | Prevents refresh token replay attacks |
| Max Sessions per User | 5                | Prevent session accumulation          |
| Cookie Name           | `sprintio.sid`   | HttpOnly, Secure, SameSite=Strict     |
| Cookie TTL            | 30 days          | Matches session TTL                   |

### 8.3 Session Implementation

```typescript
// src/lib/session.ts
import type { Redis } from 'ioredis';
import { getRedis } from './redis';
import { redisKey } from './redis-keys';
import { logger } from './logger';

interface SessionData {
  userId: string;
  workspaceId: string;
  createdAt: number;
  lastActiveAt: number;
  userAgent: string;
  ip: string;
}

const SESSION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds
const REFRESH_TTL = 30 * 24 * 60 * 60; // 30 days in seconds
const MAX_SESSIONS = 5;

export async function createSession(
  userId: string,
  refreshToken: string,
  meta: { userAgent: string; ip: string; workspaceId: string },
): Promise<void> {
  const redis = getRedis();
  const sessionKey = redisKey('session', userId);
  const refreshKey = redisKey('session', 'refresh', userId);

  const pipeline = redis.pipeline();

  // Store session data
  pipeline.hset(sessionKey, {
    userId,
    workspaceId: meta.workspaceId,
    createdAt: Date.now().toString(),
    lastActiveAt: Date.now().toString(),
    userAgent: meta.userAgent,
    ip: meta.ip,
  });
  pipeline.expire(sessionKey, SESSION_TTL);

  // Store refresh token
  pipeline.setex(refreshKey, REFRESH_TTL, refreshToken);

  // Track active sessions (sorted set by timestamp)
  pipeline.zadd('session:active', Date.now(), userId);
  pipeline.zremrangebyrank('session:active', 0, -(MAX_SESSIONS + 1));

  await pipeline.exec();
}

export async function validateSession(userId: string): Promise<SessionData | null> {
  const redis = getRedis();
  const key = redisKey('session', userId);

  const data = await redis.hgetall(key);
  if (!data || Object.keys(data).length === 0) return null;

  // Update last active timestamp
  await redis.hset(key, 'lastActiveAt', Date.now().toString());
  await redis.expire(key, SESSION_TTL); // Extend TTL on activity

  return {
    userId: data.userId,
    workspaceId: data.workspaceId,
    createdAt: Number(data.createdAt),
    lastActiveAt: Date.now(),
    userAgent: data.userAgent,
    ip: data.ip,
  };
}

export async function rotateRefreshToken(
  userId: string,
  oldRefreshToken: string,
  newRefreshToken: string,
): Promise<boolean> {
  const redis = getRedis();
  const refreshKey = redisKey('session', 'refresh', userId);

  // Atomic: check-and-delete (Lua script)
  const script = `
    local stored = redis.call('GET', KEYS[1])
    if stored == ARGV[1] then
      redis.call('SETEX', KEYS[1], ARGV[2], ARGV[3])
      return 1
    end
    return 0
  `;

  const result = (await redis.eval(
    script,
    1,
    refreshKey,
    oldRefreshToken,
    REFRESH_TTL,
    newRefreshToken,
  )) as number;

  if (result === 0) {
    // Refresh token mismatch — possible replay attack, revoke all sessions
    await revokeAllSessions(userId);
    logger.warn('Refresh token rotation failed — possible replay attack', { userId });
    return false;
  }

  return true;
}

export async function revokeAllSessions(userId: string): Promise<void> {
  const redis = getRedis();
  const sessionKey = redisKey('session', userId);
  const refreshKey = redisKey('session', 'refresh', userId);

  await redis.del(sessionKey, refreshKey);
  await redis.zrem('session:active', userId);

  // Notify other pods to clear L1 session cache
  await redis.publish('pubsub:session:revoke', JSON.stringify({ userId }));
}
```

---

## 9. Rate Limiting

### 9.1 Rate Limit Tiers

| Tier          | Scope                | Window        | Limit   | Applies To                      |
| ------------- | -------------------- | ------------- | ------- | ------------------------------- |
| Global API    | Per IP               | Sliding 1 min | 60 req  | All `/api/*` endpoints          |
| Auth API      | Per IP               | Fixed 1 min   | 10 req  | `/api/auth/*` (login, register) |
| Workspace API | Per user + workspace | Sliding 1 min | 300 req | All workspace endpoints         |
| AI API        | Per user             | Sliding 1 min | 20 req  | `/api/ai/*`                     |
| Webhook       | Per workspace        | Fixed 1 min   | 60 req  | `/api/webhooks/*`               |
| Upload        | Per user             | Fixed 1 min   | 10 req  | `/api/uploads/*`                |

### 9.2 Sliding Window Counter (Redis)

```
┌─────────────────────────────────────────────────────────────────────┐
│               SLIDING WINDOW RATE LIMIT                             │
│                                                                     │
│  Time ──────────────────────────────────────────────────────►       │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │  Window: 60s                                              │       │
│  │                                                          │       │
│  │  Current window:    ████████████████░░░░░░  (35 of 60)   │       │
│  │  Previous window:   ░░░░░░░░░░░░░░████████  (24 of 60)   │       │
│  │                                                          │       │
│  │  Weighted count = (35 * 60/60) + (24 * 0/60)            │       │
│  │                 = 35 + ~0 = 35                           │       │
│  │                                                          │       │
│  │  Allowed: 35 < 60  ✓                                      │       │
│  └──────────────────────────────────────────────────────────┘       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

```typescript
// src/lib/rate-limit.ts
import type { Redis } from 'ioredis';
import { getRedis } from './redis';
import { logger } from './logger';

interface RateLimitConfig {
  /** Max requests per window */
  maxRequests: number;
  /** Window size in seconds */
  windowSizeSec: number;
  /** Key prefix */
  prefix: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number; // Unix timestamp (seconds)
}

/**
 * Sliding window rate limiter using Redis sorted sets.
 * More accurate than fixed window; avoids burst at window boundaries.
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const redis = getRedis();
  const now = Date.now();
  const windowStart = now - config.windowSizeSec * 1000;
  const key = `rl:${config.prefix}:${identifier}`;

  try {
    const pipeline = redis.pipeline();

    // 1. Remove expired entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // 2. Count current entries in the window
    pipeline.zcard(key);

    // 3. Add current request timestamp
    pipeline.zadd(key, now.toString(), `${now}:${Math.random().toString(36).slice(2)}`);

    // 4. Set TTL on the key (2x window to allow for sliding)
    pipeline.expire(key, config.windowSizeSec * 2);

    const results = await pipeline.exec();

    const currentCount = (results?.[1]?.[1] as number) ?? 0;

    const resetAt = Math.ceil((now + config.windowSizeSec * 1000) / 1000);

    return {
      allowed: currentCount < config.maxRequests,
      remaining: Math.max(0, config.maxRequests - currentCount - 1),
      limit: config.maxRequests,
      resetAt,
    };
  } catch (err) {
    // Redis failure — fail open (allow the request)
    logger.error('Rate limit check failed (failing open)', {
      identifier,
      error: (err as Error).message,
    });
    return {
      allowed: true,
      remaining: config.maxRequests,
      limit: config.maxRequests,
      resetAt: Math.ceil((now + config.windowSizeSec * 1000) / 1000),
    };
  }
}

// ─── Express Middleware ────────────────────────────────────────

import type { Request, Response, NextFunction } from 'express';

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  api: { maxRequests: 60, windowSizeSec: 60, prefix: 'api' },
  auth: { maxRequests: 10, windowSizeSec: 60, prefix: 'auth' },
  workspace: { maxRequests: 300, windowSizeSec: 60, prefix: 'ws' },
  ai: { maxRequests: 20, windowSizeSec: 60, prefix: 'ai' },
  webhook: { maxRequests: 60, windowSizeSec: 60, prefix: 'wh' },
};

export function rateLimitMiddleware(tier: keyof typeof RATE_LIMITS) {
  const config = RATE_LIMITS[tier];

  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId || 'anonymous';
    const identifier =
      tier === 'api' ? req.ip || 'unknown' : `${userId}:${req.params.workspaceId || 'global'}`;

    const result = await checkRateLimit(identifier, config);

    // Set standard rate limit headers
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetAt);

    if (!result.allowed) {
      res.setHeader('Retry-After', Math.max(0, result.resetAt - Math.floor(Date.now() / 1000)));
      return res.status(429).json({
        error: 'Too Many Requests',
        retryAfter: result.resetAt - Math.floor(Date.now() / 1000),
      });
    }

    next();
  };
}
```

---

## 10. Frontend Caching (TanStack Query)

### 10.1 Query Client Configuration

```typescript
// src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s — default freshness window
      gcTime: 5 * 60_000, // 5min — keep in garbage collection
      retry: 2, // Retry twice on failure
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000), // Exponential backoff
      refetchOnWindowFocus: true, // Refetch when user returns to tab
      refetchOnReconnect: true, // Refetch when network reconnects
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### 10.2 Stale Time Configuration by Domain

| Domain             | staleTime         | gcTime   | refetchOnWindowFocus | Rationale                               |
| ------------------ | ----------------- | -------- | -------------------- | --------------------------------------- |
| Dashboard stats    | 30s               | 5min     | Yes                  | Frequently refreshed, high read volume  |
| Project list       | 60s               | 5min     | Yes                  | Changes less often than tasks           |
| Project detail     | 30s               | 5min     | Yes                  | Moderate change frequency               |
| Task list          | 15s               | 5min     | Yes                  | Highly dynamic; users expect fresh data |
| Task detail        | 10s               | 5min     | Yes                  | Updates frequently (comments, status)   |
| User profile       | 60s               | 10min    | Yes                  | Rarely changes                          |
| Workspace settings | 120s              | 10min    | Yes                  | Very rarely changes                     |
| Comments           | 10s               | 5min     | Yes                  | Real-time; must feel live               |
| Notifications      | 15s               | 5min     | Yes                  | Urgency-sensitive                       |
| Search results     | 0s (always fresh) | 2min     | No                   | Each search is unique                   |
| Feature flags      | Infinity          | Infinity | No                   | Managed by WebSocket, not polling       |
| Documents (Yjs)    | Infinity          | Infinity | No                   | CRDT sync handles truth                 |

### 10.3 Query Key Factories

```typescript
// src/queries/keys.ts

export const workspaceKeys = {
  all: ['workspaces'] as const,
  detail: (wsId: string) => [...workspaceKeys.all, 'detail', wsId] as const,
  members: (wsId: string) => [...workspaceKeys.all, 'members', wsId] as const,
  config: (wsId: string) => [...workspaceKeys.all, 'config', wsId] as const,
};

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (listId: string, filters?: Record<string, unknown>) =>
    [...taskKeys.lists(), { listId, ...(filters || {}) }] as const,
  detail: (taskId: string) => [...taskKeys.all, 'detail', taskId] as const,
  comments: (taskId: string) => [...taskKeys.all, 'detail', taskId, 'comments'] as const,
};

export const projectKeys = {
  all: ['projects'] as const,
  lists: (wsId: string) => [...projectKeys.all, 'lists', wsId] as const,
  detail: (projId: string) => [...projectKeys.all, 'detail', projId] as const,
  members: (projId: string) => [...projectKeys.all, 'detail', projId, 'members'] as const,
};

export const dashboardKeys = {
  all: ['dashboards'] as const,
  stats: (wsId: string) => [...dashboardKeys.all, 'stats', wsId] as const,
  detail: (dashId: string) => [...dashboardKeys.all, 'detail', dashId] as const,
};
```

### 10.4 Mutation Invalidation Map

```typescript
// src/queries/invalidation-map.ts
import type { QueryClient } from '@tanstack/react-query';
import { taskKeys, projectKeys, dashboardKeys, workspaceKeys } from './keys';

/**
 * Centralized invalidation rules: when a mutation succeeds,
 * this map defines which query keys to invalidate.
 * This ensures consistency between the mutation domain and all affected views.
 */
export function applyInvalidationRules(
  queryClient: QueryClient,
  entity: string,
  action: string,
  context: Record<string, string>,
): void {
  const { workspaceId, taskId, projectId, listId } = context;

  switch (`${entity}:${action}`) {
    case 'task:updated':
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId!) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats(workspaceId!) });
      break;

    case 'task:moved':
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats(workspaceId!) });
      break;

    case 'task:created':
      queryClient.invalidateQueries({ queryKey: taskKeys.list(listId!) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats(workspaceId!) });
      break;

    case 'task:deleted':
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats(workspaceId!) });
      break;

    case 'project:updated':
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId!) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists(workspaceId!) });
      break;

    case 'project:created':
      queryClient.invalidateQueries({ queryKey: projectKeys.lists(workspaceId!) });
      break;

    case 'member:joined':
    case 'member:left':
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId!) });
      queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId!) });
      break;

    case 'comment:added':
      queryClient.invalidateQueries({ queryKey: taskKeys.comments(taskId!) });
      break;

    default:
      // Unknown mutation — invalidate everything in the workspace (safe fallback)
      if (workspaceId) {
        queryClient.invalidateQueries({ queryKey: dashboardKeys.stats(workspaceId) });
      }
  }
}
```

### 10.5 Optimistic Updates Pattern

```typescript
// src/mutations/use-update-task.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskKeys } from '../queries/keys';
import { applyInvalidationRules } from '../queries/invalidation-map';
import type { Task } from '../types';
import { api } from '../lib/api-client';
import { toast } from 'sonner';

export function useUpdateTask(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; updates: Partial<Task> }) =>
      api.tasks.update(data.id, data.updates),

    // 1. Optimistically update the cache before the network round-trip
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(data.id) });

      const previousTask = queryClient.getQueryData<Task>(taskKeys.detail(data.id));

      queryClient.setQueryData<Task>(taskKeys.detail(data.id), (old) =>
        old ? { ...old, ...data.updates } : old,
      );

      return { previousTask };
    },

    // 2. On failure, roll back to the snapshot
    onError: (_err, data, context) => {
      queryClient.setQueryData(taskKeys.detail(data.id), context?.previousTask);
      toast.error('Failed to update task. Changes reverted.');
    },

    // 3. On success or error, revalidate to ensure server truth
    onSettled: (_data, _error, variables) => {
      applyInvalidationRules(queryClient, 'task', 'updated', {
        workspaceId,
        taskId: variables.id,
      });
    },
  });
}
```

### 10.6 Real-Time Cache Invalidation via WebSocket

```typescript
// src/hooks/use-realtime-invalidation.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { taskKeys, dashboardKeys, projectKeys, commentKeys } from '../queries/keys';

type RealtimeEvent =
  | { type: 'task.updated'; taskId: string; workspaceId: string; changes: Partial<Task> }
  | { type: 'task.moved'; taskId: string; workspaceId: string }
  | { type: 'task.created'; taskId: string; workspaceId: string; listId: string }
  | { type: 'task.deleted'; taskId: string; workspaceId: string }
  | { type: 'comment.added'; taskId: string; workspaceId: string }
  | { type: 'project.updated'; projectId: string; workspaceId: string }
  | { type: 'notification'; userId: string; notification: { title: string } };

export function useRealtimeInvalidation(socket: WebSocket) {
  const queryClient = useQueryClient();

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const data: RealtimeEvent = JSON.parse(event.data);

      switch (data.type) {
        case 'task.updated':
          // Merge changes directly — no refetch needed
          queryClient.setQueryData(taskKeys.detail(data.taskId), (old: Task | undefined) =>
            old ? { ...old, ...data.changes } : old,
          );
          queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
          queryClient.invalidateQueries({ queryKey: dashboardKeys.stats(data.workspaceId) });
          break;

        case 'task.moved':
          queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
          break;

        case 'task.created':
          queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
          break;

        case 'task.deleted':
          queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
          break;

        case 'comment.added':
          queryClient.invalidateQueries({ queryKey: commentKeys.list(data.taskId) });
          break;

        case 'project.updated':
          queryClient.invalidateQueries({ queryKey: projectKeys.detail(data.projectId) });
          queryClient.invalidateQueries({ queryKey: projectKeys.lists(data.workspaceId) });
          break;

        case 'notification':
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          toast.info(data.notification.title);
          break;
      }
    }

    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket, queryClient]);
}
```

---

## 11. CDN Caching (Cloudflare)

### 11.1 Cache Rule Categories

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CDN CACHING LAYERS                                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  IMMUTABLE STATIC ASSETS (JS, CSS, Fonts, Images)                   │    │
│  │                                                                     │    │
│  │  URL pattern: /assets/*                                             │    │
│  │  Cache-Control: public, max-age=31536000, immutable                 │    │
│  │  Strategy: Filename-based cache busting (Vite hash)                 │    │
│  │  TTL: 365 days                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  API RESPONSES (cacheable GET endpoints)                            │    │
│  │                                                                     │    │
│  │  URL pattern: /api/v1/dashboards/*, /api/v1/projects/list           │    │
│  │  Cache-Control: public, max-age=300, stale-while-revalidate=60     │    │
│  │  Vary: Authorization                                                │    │
│  │  TTL: 5 min                                                         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  USER UPLOADS (R2-backed)                                           │    │
│  │                                                                     │    │
│  │  URL pattern: /uploads/*                                            │    │
│  │  Cache-Control: public, max-age=86400                               │    │
│  │  TTL: 24 hours                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  HTML PAGES (SPA entry point)                                       │    │
│  │                                                                     │    │
│  │  URL pattern: /* (non-API, non-asset)                               │    │
│  │  Cache-Control: no-cache                                             │    │
│  │  Strategy: Always revalidate from origin                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  NEVER CACHED                                                       │    │
│  │                                                                     │    │
│  │  - POST/PUT/DELETE requests                                         │    │
│  │  - /api/v1/auth/*                                                   │    │
│  │  - WebSocket upgrades                                               │    │
│  │  - Set-Cookie responses                                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Cloudflare Page Rules / Cache Rules

```
# Cloudflare Cache Rules (via Dashboard or API)

# Rule 1: Immutable assets — never revalidate
# Pattern: /assets/*
# Cache Level: Cache Everything
# Edge TTL: 31536000 (1 year)
# Browser TTL: 31536000 (1 year)

# Rule 2: API cache — short TTL with SWR
# Pattern: /api/v1/dashboards/*
# Cache Level: Cache Everything
# Edge TTL: 300 (5 min)
# Browser TTL: 60 (1 min)
# Force Cache: true

# Rule 3: User uploads — medium TTL
# Pattern: /uploads/*
# Cache Level: Cache Everything
# Edge TTL: 86400 (24 hours)
# Browser TTL: 3600 (1 hour)

# Rule 4: API mutations — bypass
# Pattern: /api/*
# Method: POST, PUT, DELETE, PATCH
# Cache Level: Bypass

# Rule 5: Auth endpoints — bypass
# Pattern: /api/v1/auth/*
# Cache Level: Bypass
```

### 11.3 Backend Cache Headers

```typescript
// src/middleware/cache-headers.ts
import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware to set appropriate Cache-Control headers for CDN caching.
 */

/** Immutable assets — Vite-generated files with content hash */
export function immutableAssetCache(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  next();
}

/** API responses eligible for CDN caching */
export function apiCache(maxAgeSec: number, staleSec = 0) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const parts = [`public, max-age=${maxAgeSec}`];
    if (staleSec > 0) {
      parts.push(`stale-while-revalidate=${staleSec}`);
    }
    res.setHeader('Cache-Control', parts.join(', '));
    next();
  };
}

/** No-cache — always revalidate from origin */
export function noCache(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  next();
}

/** No-store — never cache (auth, mutations) */
export function noStore(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
}

// ─── Route-level application ──────────────────────────────────

// In route setup:
router.use('/assets', immutableAssetCache);

router.get('/api/v1/dashboards/:id', apiCache(300, 60), dashboardHandler);
router.get('/api/v1/projects', apiCache(120, 30), projectListHandler);
router.get('/api/v1/users/:id/profile', apiCache(120, 30), userProfileHandler);

router.use('/api/v1/auth', noStore);
router.use('/api/v1/uploads', noStore);
```

---

## 12. Monitoring & Observability

### 12.1 Metrics to Track

| Metric                            | Type    | Description                                | Alert Threshold              |
| --------------------------------- | ------- | ------------------------------------------ | ---------------------------- |
| `redis_hit_ratio`                 | Gauge   | L2 cache hit rate (hits / (hits + misses)) | < 80% sustained              |
| `redis_l1_hit_ratio`              | Gauge   | L1 cache hit rate                          | < 60% sustained              |
| `redis_memory_used_bytes`         | Gauge   | Current memory usage                       | > 80% of maxmemory           |
| `redis_memory_peak_bytes`         | Gauge   | Peak memory usage                          | > 90% of maxmemory           |
| `redis_connected_clients`         | Gauge   | Active connections                         | > 1000 (investigate)         |
| `redis_operations_per_sec`        | Gauge   | Total ops/sec                              | > 50,000 (capacity planning) |
| `redis_evicted_keys_total`        | Counter | Keys evicted by LRU                        | > 100/sec (increase memory)  |
| `redis_keyspace_misses_total`     | Counter | Total cache misses                         | Monitor for trends           |
| `redis_latency_p99_ms`            | Gauge   | P99 command latency                        | > 5ms                        |
| `cache_invalidation_events_total` | Counter | Total invalidation events                  | Monitor rate                 |
| `session_active_count`            | Gauge   | Active user sessions                       | Capacity planning            |
| `rate_limit_rejections_total`     | Counter | Requests rejected by rate limiter          | > 1% of total requests       |
| `l1_eviction_total`               | Counter | L1 cache evictions (LRU)                   | > 100/sec                    |
| `cdn_hit_ratio`                   | Gauge   | Cloudflare CDN hit rate                    | < 85%                        |

### 12.2 Redis Monitoring Script

```bash
#!/bin/bash
# scripts/redis-monitor.sh — Quick health check

REDIS_HOST=${REDIS_HOST:-127.0.0.1}
REDIS_PORT=${REDIS_PORT:-6379}

echo "=== Redis Health Check ==="
echo "Host: $REDIS_HOST:$REDIS_PORT"
echo ""

# Memory usage
echo "📊 Memory:"
redis-cli -h $REDIS_HOST -p $REDIS_PORT INFO memory | grep -E "used_memory_human|maxmemory_human|mem_fragmentation_ratio"

# Hit ratio
echo ""
echo "📊 Hit Ratio:"
redis-cli -h $REDIS_HOST -p $REDIS_PORT INFO stats | grep -E "keyspace_hits|keyspace_misses"

# Calculate hit ratio
HITS=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT INFO stats | grep keyspace_hits | cut -d: -f2 | tr -d '\r')
MISSES=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT INFO stats | grep keyspace_misses | cut -d: -f2 | tr -d '\r')
if [ "$HITS" -gt 0 ] 2>/dev/null; then
  TOTAL=$((HITS + MISSES))
  RATIO=$(echo "scale=2; $HITS * 100 / $TOTAL" | bc)
  echo "  Hit Ratio: ${RATIO}%"
fi

# Connected clients
echo ""
echo "📊 Connections:"
redis-cli -h $REDIS_HOST -p $REDIS_PORT INFO clients | grep connected_clients

# Key count
echo ""
echo "📊 Keys:"
redis-cli -h $REDIS_HOST -p $REDIS_PORT INFO keyspace

# Slow log
echo ""
echo "📊 Slow Log (last 5):"
redis-cli -h $REDIS_HOST -p $REDIS_PORT SLOWLOG GET 5
```

### 12.3 Prometheus Queries

```yaml
# prometheus/cache-rules.yml
groups:
  - name: sprintio_cache
    interval: 15s
    rules:
      # Cache hit ratio
      - record: sprintio:cache_hit_ratio:5m
        expr: |
          rate(redis_keyspace_hits_total[5m])
          /
          (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))

      # Memory utilization percentage
      - record: sprintio:redis_memory_utilization:ratio
        expr: |
          redis_memory_used_bytes / redis_memory_max_bytes

      # Eviction rate (indicator of memory pressure)
      - record: sprintio:redis_eviction_rate:1m
        expr: rate(redis_evicted_keys_total[1m])

      # P99 latency
      - record: sprintio:redis_latency_p99:1m
        expr: histogram_quantile(0.99, rate(redis_command_duration_seconds_bucket[1m]))

  - name: sprintio_cache_alerts
    rules:
      # Low cache hit ratio
      - alert: CacheHitRatioLow
        expr: sprintio:cache_hit_ratio:5m < 0.80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'Redis cache hit ratio below 80%'
          description: 'Current hit ratio: {{ $value | humanizePercentage }}'

      # Memory pressure
      - alert: CacheMemoryHigh
        expr: sprintio:redis_memory_utilization:ratio > 0.80
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'Redis memory usage above 80%'
          description: 'Current memory utilization: {{ $value | humanizePercentage }}'

      # High eviction rate
      - alert: CacheEvictionRateHigh
        expr: sprintio:redis_eviction_rate:1m > 100
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'Redis eviction rate exceeds 100 keys/sec'

      # High latency
      - alert: CacheLatencyHigh
        expr: sprintio:redis_latency_p99:1m > 0.005
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'Redis P99 latency above 5ms'
```

### 12.4 Grafana Dashboard Panels

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  REDIS CACHE DASHBOARD                                                      │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌───────────────────┐  │
│  │  Cache Hit Ratio     │  │  Memory Usage        │  │  Ops/Second       │  │
│  │  ████████░░ 92%      │  │  ████░░░░░░ 3.2/8GB  │  │  24,532           │  │
│  │  Target: >80% ✓      │  │  40% utilized ✓      │  │  Within capacity ✓│  │
│  └──────────────────────┘  └──────────────────────┘  └───────────────────┘  │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌───────────────────┐  │
│  │  L1 Hit Ratio        │  │  Eviction Rate       │  │  P99 Latency      │  │
│  │  ██████░░░░ 78%      │  │  ░░░░░░░░░░ 12/min   │  │  █░░░░░░░░░ 1.2ms │  │
│  │  Target: >60% ✓      │  │  Low ✓               │  │  Target: <5ms ✓   │  │
│  └──────────────────────┘  └──────────────────────┘  └───────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Hit Ratio Over Time (24h)                                           │  │
│  │  100%│      ··········                                               │  │
│  │   80%│·····           ···········                                    │  │
│  │   60%│                                    ···········                │  │
│  │   40%│                                                              │  │
│  │   20%│                                                              │  │
│  │      └────────────────────────────────────────────────────────────── │  │
│  │      00:00    06:00    12:00    18:00    00:00                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Key Count by Domain                                                 │  │
│  │                                                                       │  │
│  │  session     ████████████████████████████ 124,532                     │  │
│  │  cache       ██████████████████████ 89,234                           │  │
│  │  perm        ████████████████ 67,891                                 │  │
│  │  presence    ████████ 34,213                                          │  │
│  │  rl          ██████ 23,456                                            │  │
│  │  ai          ███ 12,345                                               │  │
│  │  stats       ██ 8,765                                                 │  │
│  │  search      █ 3,456                                                  │  │
│  │  ff          █ 1,234                                                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 12.5 Health Check Integration

```typescript
// src/routes/health.ts
import { Router } from 'express';
import { getRedis } from '../lib/redis';
import { logger } from '../lib/logger';

const router = Router();

router.get('/health/redis', async (_req, res) => {
  try {
    const redis = getRedis();
    const start = Date.now();
    const pong = await redis.ping();
    const latency = Date.now() - start;

    const info = await redis.info('memory');
    const usedMemory = info.match(/used_memory_human:(\S+)/)?.[1] || 'unknown';
    const maxMemory = info.match(/maxmemory_human:(\S+)/)?.[1] || 'unknown';

    res.json({
      status: 'healthy',
      redis: {
        ping: pong,
        latencyMs: latency,
        memory: { used: usedMemory, max: maxMemory },
      },
    });
  } catch (err) {
    logger.error('Redis health check failed', { error: (err as Error).message });
    res.status(503).json({
      status: 'unhealthy',
      error: 'Redis connection failed',
    });
  }
});

export { router as healthRouter };
```

---

## 13. Anti-Patterns & Protection

### 13.1 Cache Stampede (Breakdown)

**Problem**: A hot key expires, and hundreds of concurrent requests all hit the database simultaneously.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CACHE STAMPEDE                                     │
│                                                                     │
│  ┌────────────┐                                                     │
│  │ Key Expired │                                                     │
│  └─────┬──────┘                                                     │
│        │                                                            │
│   ┌────┴────────────────────────────────────────┐                   │
│   │                                             │                   │
│   ▼              ▼              ▼              ▼                    │
│  Request 1   Request 2   Request 3   Request N                     │
│   │              │              │              │                    │
│   │  ALL MISS    │  ALL MISS    │  ALL MISS   │                    │
│   ▼              ▼              ▼              ▼                    │
│  ┌─────────────────────────────────────────────────┐               │
│  │              DATABASE                           │               │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐     │               │
│  │  │ Q1  │ │ Q2  │ │ Q3  │ │ Q4  │ │ QN  │     │               │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘     │               │
│  │              OVERWHELMED!                       │               │
│  └─────────────────────────────────────────────────┘               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Solution**: Lock-based stampede prevention with singleflight pattern.

```typescript
// src/lib/singleflight.ts

const inflight = new Map<string, Promise<any>>();

/**
 * Singleflight: ensures only one concurrent call is made for a given key.
 * If N requests arrive simultaneously for the same key, only 1 hits the DB;
 * the other N-1 wait for the same result.
 */
export function singleflight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) {
    return existing;
  }

  const promise = fn().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

// Usage:
async function getHotDashboardStats(dashId: string) {
  return singleflight(`dashboard:${dashId}`, async () => {
    return cacheAside({
      key: redisKey('cache', '*', 'dashboard', dashId),
      ttl: jitterTTL(60),
      l1TtlMs: 10_000,
      fetchFn: () =>
        db.query.dashboards.findFirst({
          where: eq(dashboards.id, dashId),
        }),
    });
  });
}
```

### 13.2 Thundering Herd

**Problem**: Many keys expire at the same time (e.g., all permission keys created within the same second), causing a burst of cache misses.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    THUNDERING HERD                                    │
│                                                                     │
│  Time ──────────────────────────────────────────────────────►       │
│                                                                     │
│  Key A TTL: ────────────────────┐                                    │
│  Key B TTL: ────────────────────┤                                    │
│  Key C TTL: ────────────────────┤  ALL EXPIRE SIMULTANEOUSLY        │
│  Key D TTL: ────────────────────┤                                    │
│                                 ▼                                    │
│                          ┌──────────────┐                            │
│                          │  DB SPIKE     │                            │
│                          │  📈📈📈📈📈   │                            │
│                          └──────────────┘                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Solution**: TTL jitter (covered in §6.3) + probabilistic early recompute.

```typescript
// src/lib/early-recompute.ts
import type { Redis } from 'ioredis';
import { getRedis } from './redis';

/**
 * Probabilistic early recompute: when a key is accessed and is within
 * the "danger zone" (close to expiry), a background recompute is triggered
 * probabilistically. This spreads out recomputation over time.
 *
 * @param key - Redis key
 * @param ttl - Original TTL in seconds
 * @param threshold - Fraction of TTL at which to start early recompute (default: 0.2 = last 20%)
 * @param recomputeFn - Function to recompute the value
 */
export async function earlyRecompute<T>(
  key: string,
  ttl: number,
  threshold: number,
  recomputeFn: () => Promise<T>,
): Promise<void> {
  const redis = getRedis();
  const remaining = await redis.ttl(key);

  if (remaining <= 0) return; // Key is already expired or missing

  const dangerZone = ttl * threshold;

  if (remaining <= dangerZone) {
    // Probability increases as TTL approaches 0
    const probability = 1 - remaining / dangerZone;

    if (Math.random() < probability) {
      // Trigger background recompute — don't await
      recomputeFn().catch(() => {
        // Background recompute failed — will be recomputed on next access
      });
    }
  }
}
```

### 13.3 Cold Start (Cache Warming)

**Problem**: After a deployment or Redis restart, the cache is empty. All requests hit the database until the cache is naturally populated.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COLD START WARMING                                │
│                                                                     │
│  Deployment                                                         │
│    │                                                                │
│    ▼                                                                │
│  ┌──────────────────────────────────────────────┐                   │
│  │  Pre-warm Phase (runs at startup)             │                   │
│  │                                                │                   │
│  │  1. Warm session keys (from DB active sessions)│                   │
│  │  2. Warm permission caches (top 100 workspaces)│                   │
│  │  3. Warm feature flags (all active flags)      │                   │
│  │  4. Warm workspace configs (top 50 workspaces) │                   │
│  └──────────────────────────────────────────────┘                   │
│    │                                                                │
│    ▼                                                                │
│  ┌──────────────────────────────────────────────┐                   │
│  │  Traffic resumes — cache is warm              │                   │
│  │  DB receives minimal spike (only uncached)    │                   │
│  └──────────────────────────────────────────────┘                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

```typescript
// src/lib/cache-warmer.ts
import { getRedis } from './redis';
import { redisKey } from './redis-keys';
import { jitterTTL } from './ttl';
import { db } from './database';
import { permissions, featureFlags, workspaces } from '../db/schema';
import { logger } from './logger';

interface WarmerConfig {
  /** Max workspaces to pre-warm */
  maxWorkspaces: number;
  /** Concurrency limit for warming */
  concurrency: number;
}

const DEFAULT_CONFIG: WarmerConfig = {
  maxWorkspaces: 100,
  concurrency: 5,
};

export async function warmCache(config = DEFAULT_CONFIG): Promise<void> {
  const redis = getRedis();
  const start = Date.now();

  logger.info('Starting cache warming', { config });

  // 1. Warm feature flags
  try {
    const flags = await db.select().from(featureFlags);
    const pipeline = redis.pipeline();
    for (const flag of flags) {
      const key = redisKey('ff', 'workspace', flag.workspaceId);
      pipeline.hset(key, flag.key, flag.enabled ? 'true' : 'false');
      pipeline.expire(key, jitterTTL(60));
    }
    await pipeline.exec();
    logger.info('Feature flags warmed', { count: flags.length });
  } catch (err) {
    logger.error('Failed to warm feature flags', { error: (err as Error).message });
  }

  // 2. Warm workspace configs (top N)
  try {
    const topWorkspaces = await db
      .select()
      .from(workspaces)
      .orderBy(workspaces.createdAt)
      .limit(config.maxWorkspaces);

    const pipeline = redis.pipeline();
    for (const ws of topWorkspaces) {
      const key = redisKey('cache', ws.id, 'config');
      pipeline.setex(key, jitterTTL(300), JSON.stringify(ws));
    }
    await pipeline.exec();
    logger.info('Workspace configs warmed', { count: topWorkspaces.length });
  } catch (err) {
    logger.error('Failed to warm workspace configs', { error: (err as Error).message });
  }

  // 3. Warm permission caches (top workspaces)
  try {
    const topWorkspaces = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .orderBy(workspaces.createdAt)
      .limit(config.maxWorkspaces);

    const pipeline = redis.pipeline();
    for (const ws of topWorkspaces) {
      const perms = await db.select().from(permissions).where(eq(permissions.workspaceId, ws.id));

      for (const perm of perms) {
        const key = redisKey('perm', ws.id, 'user', perm.userId);
        pipeline.sadd(key, ...perm.roles.map(String));
        pipeline.expire(key, jitterTTL(300));
      }
    }
    await pipeline.exec();
    logger.info('Permission caches warmed');
  } catch (err) {
    logger.error('Failed to warm permission caches', { error: (err as Error).message });
  }

  logger.info('Cache warming complete', { durationMs: Date.now() - start });
}

// Call at startup (after Redis is connected, before accepting traffic):
// await warmCache();
```

### 13.4 Hot Key Prevention

**Problem**: A single key receives disproportionate traffic (e.g., a global feature flag), overwhelming a single Redis shard.

**Solution**: L1 cache acts as a shield. For extreme cases, replicate to multiple L1 instances.

```typescript
// Hot key detection and mitigation
export async function hotKeyGuard<T>(
  key: string,
  l1TtlMs: number,
  l1Cache: L1Cache<T>,
  fetchFn: () => Promise<T>,
  redisGetFn: () => Promise<T>,
): Promise<T> {
  // L1 absorbs the hot key traffic — no Redis round-trip needed
  const l1Value = l1Cache.get(key);
  if (l1Value !== undefined) return l1Value;

  // L2 (Redis) with short L1 TTL to rapidly re-shield
  const value = await redisGetFn();
  l1Cache.set(key, value, l1TtlMs);
  return value;
}
```

### 13.5 Cache Avalanche

**Problem**: Many keys with the same TTL expire simultaneously, causing a stampede.

**Solution**: TTL jitter (§6.3) + staggered warming.

```typescript
// Staggered cache warming after invalidation
async function staggeredRewarm(keys: string[], fetchFns: (() => Promise<any>)[]): Promise<void> {
  for (let i = 0; i < keys.length; i++) {
    const delay = Math.random() * 100; // 0-100ms random delay
    setTimeout(async () => {
      try {
        const value = await fetchFns[i]();
        const redis = getRedis();
        await redis.setex(keys[i], jitterTTL(60), JSON.stringify(value));
      } catch (err) {
        logger.warn('Staggered rewarm failed', { key: keys[i] });
      }
    }, delay);
  }
}
```

---

## 14. Quick Reference Cheat Sheet

### Redis Key Patterns

| Domain        | Pattern                           | TTL       |
| ------------- | --------------------------------- | --------- |
| Session       | `session:{userId}`                | 30d       |
| Refresh Token | `session:refresh:{userId}`        | 30d       |
| Permission    | `perm:{wsId}:user:{userId}`       | 5min      |
| API Cache     | `cache:{wsId}:{entity}:{id}`      | 30s–120s  |
| Rate Limit    | `rl:{tier}:{identifier}:{window}` | 1–2min    |
| Presence      | `presence:{wsId}:user:{userId}`   | 30s       |
| Feature Flag  | `ff:workspace:{wsId}`             | 60s       |
| Stats         | `stats:{wsId}:{metric}:{period}`  | 120s–300s |
| AI Cache      | `ai:{wsId}:prompt:{hash}`         | 1h        |

### TTL Quick Reference

| Data Type          | L1 TTL | L2 TTL | SWR Window |
| ------------------ | ------ | ------ | ---------- |
| Feature flags      | 5s     | 60s    | —          |
| Permissions        | 30s    | 5min   | —          |
| Task detail        | 5s     | 30s    | 5s         |
| Project detail     | 10s    | 60s    | 10s        |
| User profile       | 10s    | 120s   | 10s        |
| Dashboard stats    | 10s    | 60s    | 10s        |
| Workspace config   | 60s    | 5min   | 60s        |
| Session            | —      | 30d    | —          |
| AI response        | —      | 1h     | —          |
| Rate limit counter | —      | 1min   | —          |

### Strategy Quick Reference

| Pattern       | Write Path                       | Read Path                     | Consistency     | Use For               |
| ------------- | -------------------------------- | ----------------------------- | --------------- | --------------------- |
| Cache-aside   | Write DB → set cache             | Read cache → miss → read DB   | Eventual        | API cache, AI cache   |
| Write-through | Write DB + cache simultaneously  | Read cache (always hit)       | Strong          | Sessions, permissions |
| Write-behind  | Write cache → async DB flush     | Read cache (always hit)       | Eventual        | Presence, stats       |
| SWR           | Cache-aside + background refresh | Serve stale, revalidate async | Eventual (fast) | Dashboard, lists      |

### Invalidation Checklist

- [ ] Every cache key has a TTL (backstop for missed invalidations)
- [ ] Every write operation publishes an invalidation event
- [ ] Invalidation events include all affected key patterns (with wildcards)
- [ ] L1 caches are invalidated on all pods (via Redis Pub/Sub broadcast)
- [ ] Frontend invalidation rules are defined for each mutation type
- [ ] TTL jitter prevents thundering herd

### Monitoring Checklist

- [ ] Redis hit ratio alert at < 80%
- [ ] Redis memory alert at > 80%
- [ ] Redis P99 latency alert at > 5ms
- [ ] Eviction rate monitored
- [ ] CDN hit ratio tracked
- [ ] Rate limit rejection rate tracked
- [ ] Dashboard shows key count by domain
- [ ] Health check endpoint for Redis connectivity

### Common Commands

```bash
# Check Redis memory usage
redis-cli INFO memory

# Monitor live commands
redis-cli MONITOR

# Check slow commands
redis-cli SLOWLOG GET 10

# Count keys by pattern
redis-cli --scan --pattern "cache:ws_abc:*" | wc -l

# Check specific key TTL
redis-cli TTL "perm:ws_abc:user:usr_xyz"

# Manual invalidation
redis-cli DEL "cache:ws_abc:task:tsk_123"

# Check cluster info (production)
redis-cli CLUSTER INFO
redis-cli CLUSTER NODES

# Check keyspace hit ratio
redis-cli INFO stats | grep keyspace
```
