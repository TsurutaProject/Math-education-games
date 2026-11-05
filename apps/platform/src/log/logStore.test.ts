import { describe, expect, it } from 'vitest'
import {
  createLogStore,
  getSessionId,
  LOG_STORAGE_KEY,
  MAX_EVENTS,
  SESSION_STORAGE_KEY,
  type KeyValueStorage,
  type LogEvent,
} from './logStore'

const memoryStorage = (initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } => {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value
    },
  }
}

const fixedNow = () => new Date('2026-11-01T01:02:03.000Z')

describe('createLogStore', () => {
  it('イベントを時刻・セッション・ゲーム名つきで保存する', () => {
    const store = createLogStore(memoryStorage(), 'abc', fixedNow)
    store.log('cake', 'stage_clear', { stage: 2, perfect: true })

    expect(store.all()).toEqual([
      {
        t: '2026-11-01T01:02:03.000Z',
        sessionId: 'abc',
        game: 'cake',
        type: 'stage_clear',
        data: { stage: 2, perfect: true },
      },
    ])
  })

  it('data を渡さないときは data を持たない', () => {
    const store = createLogStore(memoryStorage(), 'abc', fixedNow)
    store.log('platform', 'home_view')
    expect('data' in store.all()[0]).toBe(false)
  })

  it('別のページが書いたログを上書きして消さない', () => {
    const storage = memoryStorage()
    const platform = createLogStore(storage, 's1', fixedNow)
    platform.log('platform', 'home_view')

    // ゲーム側（別のストア）が同じ保存先に書く
    const game = createLogStore(storage, 's1', fixedNow)
    game.log('cake', 'stage_start')

    // 古い状態を持っていたはずのプラットフォーム側が続けて書いても、ゲームのログは残る
    platform.log('platform', 'game_open', { gameId: 'cake' })

    expect(platform.all().map((e) => e.type)).toEqual(['home_view', 'stage_start', 'game_open'])
  })

  it('上限を超えたら古いものから捨てる', () => {
    // 上限ぴったりのログが入っている状態から始める（1件ずつ 5000 回書くと遅いため）
    const seeded: LogEvent[] = Array.from({ length: MAX_EVENTS }, (_, i) => ({
      t: '2026-11-01T00:00:00.000Z',
      sessionId: 'old',
      game: 'platform',
      type: 'tick',
      data: { i },
    }))
    const storage = memoryStorage({ [LOG_STORAGE_KEY]: JSON.stringify(seeded) })
    const store = createLogStore(storage, 'abc', fixedNow)

    for (let i = MAX_EVENTS; i < MAX_EVENTS + 3; i++) store.log('platform', 'tick', { i })

    const events = store.all()
    expect(events).toHaveLength(MAX_EVENTS)
    expect(events[0].data).toEqual({ i: 3 })
    expect(events.at(-1)?.data).toEqual({ i: MAX_EVENTS + 2 })
  })

  it('壊れたデータや形の違うデータは無視して続行する', () => {
    const storage = memoryStorage({ [LOG_STORAGE_KEY]: '{broken' })
    const store = createLogStore(storage, 'abc', fixedNow)
    expect(store.all()).toEqual([])

    storage.data[LOG_STORAGE_KEY] = JSON.stringify([{ nope: 1 }, 'x', null])
    expect(store.all()).toEqual([])

    store.log('platform', 'home_view')
    expect(store.all()).toHaveLength(1)
  })

  it('保存先が使えなくても例外を出さない', () => {
    const store = createLogStore(null, 'abc', fixedNow)
    expect(() => store.log('platform', 'home_view')).not.toThrow()
    expect(store.all()).toEqual([])

    const throwing: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded')
      },
    }
    expect(() => createLogStore(throwing, 'abc', fixedNow).log('platform', 'home_view')).not.toThrow()
  })

  it('clear で空になり、exportJson は件数つきの JSON を返す', () => {
    const store = createLogStore(memoryStorage(), 'abc', fixedNow)
    store.log('platform', 'home_view')
    store.log('cake', 'stage_start')

    const exported = JSON.parse(store.exportJson())
    expect(exported.count).toBe(2)
    expect(exported.exportedAt).toBe('2026-11-01T01:02:03.000Z')
    expect(exported.events).toHaveLength(2)

    store.clear()
    expect(store.all()).toEqual([])
  })
})

describe('getSessionId', () => {
  it('同じストレージなら同じ id を返す', () => {
    const storage = memoryStorage()
    const first = getSessionId(storage)
    expect(first).not.toBe('')
    expect(getSessionId(storage)).toBe(first)
    expect(storage.data[SESSION_STORAGE_KEY]).toBe(first)
  })

  it('ストレージがなくても id を返す', () => {
    expect(getSessionId(null)).not.toBe('')
  })
})
