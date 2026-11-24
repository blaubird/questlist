// Интеграция с настоящим PocketBase (наши миграции и хуки). Запускается, только если задан сервер:
//   PB_IT_URL, PB_IT_EMAIL, PB_IT_PASSWORD — тестовый пользователь на одноразовом сервере.
// Живую подписку (EventSource) здесь не проверяем — в Node её нет; её проверяет браузер.
import { describe, expect, it } from 'vitest'
import { memoryStorage } from '../src/sync/storage.ts'
import { GameStore } from '../src/sync/store.ts'
import { pocketbaseRemote } from '../src/sync/pocketbase.ts'
import { Sync } from '../src/sync/sync.ts'

const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env
const url = env.PB_IT_URL
// В Node нет EventSource: заглушка, которая никогда не подключается (как телефон без сети).
const g = globalThis as { EventSource?: unknown }
g.EventSource ??= class {
  addEventListener() {}
  close() {}
}
const email = env.PB_IT_EMAIL ?? ''
const password = env.PB_IT_PASSWORD ?? ''

async function device(seed0: number, t: { now: number }) {
  let seed = seed0
  const storage = memoryStorage()
  const store = await GameStore.open(storage, { clock: () => t.now, seed: () => seed++ })
  const remote = await pocketbaseRemote(url!)
  const sync = new Sync(store, remote, { clock: () => t.now, debounceMs: 0, busyMs: 200 })
  return { store, storage, remote, sync }
}

describe.skipIf(!url)('PocketBase: настоящий сервер', () => {
  it('вход, отправка 300 событий, второе устройство догоняет, дубль не проходит', async () => {
    const t = { now: Date.now() }
    const a = await device(1, t)
    await expect(a.sync.login(email, 'неверный-пароль')).rejects.toThrow()
    await a.sync.login(email, password)
    for (let i = 0; i < 150; i++) {
      const id = (
        a.store.dispatch({ type: 'task.add', title: `Дело ${i}`, diff: 'e', daily: false }).info as {
          id: string
        }
      ).id
      t.now += 1000
      a.store.dispatch({ type: 'task.complete', id })
    }
    await a.sync.syncNow()
    expect(a.sync.status).toMatchObject({ state: 'ok', pending: 0, error: null })

    const b = await device(9000, t)
    await b.sync.login(email, password)
    expect(b.store.state.profile).toEqual(a.store.state.profile)

    // Ещё раз те же события в очереди — сервер говорит «уже есть», очередь пустеет.
    await a.storage.addEvents(a.store.events.slice(0, 5), true)
    await a.sync.syncNow()
    expect(a.sync.status).toMatchObject({ state: 'ok', pending: 0 })

    // Чужое событие с чужим user не проходит: подменить поле user нельзя.
    const pb = new (await import('pocketbase')).default(url!)
    await pb.collection('users').authWithPassword(email, password)
    await expect(
      pb
        .collection('events')
        .create({ user: 'xxxxxxxxxxxxxxx', eid: 'forged-0001', ts: 1, dev: 'x', type: 't', data: {} }),
    ).rejects.toMatchObject({ status: 400 })
    // Журнал неизменяемый.
    const one = await pb.collection('events').getList(1, 1)
    await expect(pb.collection('events').update(one.items[0]!.id, { type: 'hack' })).rejects.toBeTruthy()
    await expect(pb.collection('events').delete(one.items[0]!.id)).rejects.toBeTruthy()
    // Регистрация закрыта.
    await expect(
      new (await import('pocketbase')).default(url!)
        .collection('users')
        .create({ email: 'x@example.test', password: 'abcdefgh12', passwordConfirm: 'abcdefgh12' }),
    ).rejects.toBeTruthy()
    // Токен на 90 дней.
    const exp = JSON.parse(atob(pb.authStore.token.split('.')[1]!)).exp * 1000
    expect(exp - Date.now()).toBeGreaterThan(80 * 24 * 3600_000)
  }, 120_000)
})
