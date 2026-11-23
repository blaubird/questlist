// Локальное хранилище журнала: IndexedDB, а если её нет (приватный режим, тесты) — память.
// События только дописываются (ключ — id), поэтому две вкладки не могут затереть друг друга.
import type { Run } from '../core/dungeon/types.ts'
import type { ProfileEvent } from '../core/state.ts'

export interface Meta {
  /** Id устройства — часть id событий. */
  dev: string
  /** Последнее выданное время события на этом устройстве (монотонность при переводе часов). */
  lastTs: number
  /** Забег в процессе — только на этом устройстве. */
  run: Run | null
}

export interface Storage {
  readonly kind: 'idb' | 'memory'
  loadEvents(): Promise<ProfileEvent[]>
  addEvents(events: readonly ProfileEvent[]): Promise<void>
  loadMeta(): Promise<Meta | null>
  saveMeta(meta: Meta): Promise<void>
}

export function memoryStorage(): Storage {
  const events = new Map<string, ProfileEvent>()
  let meta: Meta | null = null
  return {
    kind: 'memory',
    loadEvents: async () => [...events.values()],
    addEvents: async (es) => {
      for (const e of es) if (!events.has(e.id)) events.set(e.id, e)
    },
    loadMeta: async () => (meta ? structuredClone(meta) : null),
    saveMeta: async (m) => {
      meta = structuredClone(m)
    },
  }
}

const DB = 'questlist'
const VERSION = 1

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((ok, fail) => {
    r.onsuccess = () => ok(r.result)
    r.onerror = () => fail(r.error)
  })
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((ok, fail) => {
    tx.oncomplete = () => ok()
    tx.onabort = tx.onerror = () => fail(tx.error)
  })
}

export async function idbStorage(): Promise<Storage> {
  const open = indexedDB.open(DB, VERSION)
  open.onupgradeneeded = () => {
    const db = open.result
    if (!db.objectStoreNames.contains('events')) db.createObjectStore('events', { keyPath: 'id' })
    if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
  }
  const db = await req(open)
  // Другая вкладка обновила схему — закрываемся, чтобы не блокировать её.
  db.onversionchange = () => db.close()
  return {
    kind: 'idb',
    loadEvents: () => req(db.transaction('events').objectStore('events').getAll()) as Promise<ProfileEvent[]>,
    addEvents: async (es) => {
      if (!es.length) return
      const tx = db.transaction('events', 'readwrite')
      const st = tx.objectStore('events')
      // put с тем же id — та же самая запись (события неизменяемы), дубль безвреден.
      for (const e of es) st.put(e)
      await done(tx)
    },
    loadMeta: async () =>
      ((await req(db.transaction('meta').objectStore('meta').get('meta'))) as Meta) ?? null,
    saveMeta: async (m) => {
      const tx = db.transaction('meta', 'readwrite')
      tx.objectStore('meta').put(m, 'meta')
      await done(tx)
    },
  }
}

/** IndexedDB, если доступна; иначе память (прогресс не переживёт перезагрузку — интерфейс предупредит). */
export async function openStorage(): Promise<Storage> {
  try {
    if (typeof indexedDB !== 'undefined') return await idbStorage()
  } catch {
    /* приватный режим и т. п. */
  }
  return memoryStorage()
}
