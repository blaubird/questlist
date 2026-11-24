// Remote поверх PocketBase. SDK грузится лениво — без сервера он не нужен.
// Коллекция events: user, eid, ts, dev, type, data, created (deploy/pb_migrations).
import type { ProfileEvent } from '../core/state.ts'
import { RemoteError, type Remote, type RemoteEvent } from './sync.ts'

interface PbError {
  status?: number
  isAbort?: boolean
  response?: { message?: string }
}

/** Разложить ошибку SDK: сеть/сервер выключен, вход, отказ, прочее. */
export function classify(e: unknown): RemoteError {
  const err = e as PbError
  const s = err?.status ?? 0
  const msg = err?.response?.message ?? (e instanceof Error ? e.message : String(e))
  // 0 — нет сети или CORS; 502/503/504 — Funnel жив, а PocketBase на компе нет; 404 — Funnel без /api.
  if (s === 0 || s === 404 || s >= 500) return new RemoteError('offline', msg)
  if (s === 401 || s === 403) return new RemoteError('auth', msg)
  if (s === 400) return new RemoteError('rejected', msg)
  if (s === 429) return new RemoteError('busy', msg)
  return new RemoteError('other', msg)
}

export async function pocketbaseRemote(url: string): Promise<Remote> {
  const { default: PocketBase } = await import('pocketbase')
  const pb = new PocketBase(url)
  pb.autoCancellation(false)
  const col = () => pb.collection('events')
  const toEvent = (r: Record<string, unknown>): RemoteEvent =>
    ({
      id: r.eid,
      ts: r.ts,
      dev: r.dev,
      type: r.type,
      data: r.data,
      created: r.created,
    }) as RemoteEvent
  const wrap = async <T>(p: Promise<T>): Promise<T> => {
    try {
      return await p
    } catch (e) {
      throw classify(e)
    }
  }

  return {
    userId: () => (pb.authStore.record ? pb.authStore.record.id : null),
    userEmail: () => (pb.authStore.record?.email as string | undefined) ?? null,
    login: async (email, password) => {
      await wrap(pb.collection('users').authWithPassword(email, password))
    },
    logout: () => pb.authStore.clear(),
    refresh: async () => {
      await wrap(pb.collection('users').authRefresh())
    },
    push: async (e: ProfileEvent) => {
      const user = pb.authStore.record?.id
      if (!user) throw new RemoteError('auth', 'Нет входа')
      try {
        await col().create({ user, eid: e.id, ts: e.ts, dev: e.dev, type: e.type, data: e.data })
        return 'ok'
      } catch (err) {
        const c = classify(err)
        if (c.kind !== 'rejected') throw c
        // 400 — чаще всего дубль (уникальный индекс user+eid): ответ на прошлую отправку потерялся.
        const found = await wrap(
          col().getList(1, 1, { filter: pb.filter('eid = {:eid}', { eid: e.id }), skipTotal: true }),
        )
        if (found.items.length) return 'dup'
        throw c
      }
    },
    pull: async (since, page, perPage) => {
      const res = await wrap(
        col().getList(page, perPage, {
          ...(since ? { filter: pb.filter('created >= {:since}', { since }) } : {}),
          sort: 'created,eid',
          fields: 'eid,ts,dev,type,data,created',
          skipTotal: true,
        }),
      )
      return res.items.map((r) => toEvent(r as unknown as Record<string, unknown>))
    },
    subscribe: async (onEvent, onReconnect) => {
      let first = true
      const offConnect = await wrap(
        pb.realtime.subscribe('PB_CONNECT', () => {
          if (first) first = false
          else onReconnect()
        }),
      )
      const off = await wrap(
        col().subscribe('*', (ev) => {
          if (ev.action === 'create') onEvent(toEvent(ev.record as unknown as Record<string, unknown>))
        }),
      )
      return () => {
        void off().catch(() => {})
        void offConnect().catch(() => {})
      }
    },
  }
}
