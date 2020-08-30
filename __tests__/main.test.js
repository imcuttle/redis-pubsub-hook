/* eslint-disable */
const RedisPubSub = require('..')

const delay = (ms) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}

jest.setTimeout(10 * 1000)
jest.useRealTimers()
describe('RedisPubSub', () => {
  it.skip('should multi nodes', async function () {
    const pubsub = new RedisPubSub({
      uid: '1',
      redis: ['redis://localhost:6379'],
      hooks: {
        name: () => '123'
      }
    })

    // 2
    const x = new RedisPubSub({
      uid: '2',
      redis: ['redis://localhost:6379'],
      hooks: {
        name: () => '222'
      }
    })

    // 3
    const y = new RedisPubSub({
      uid: '3',
      redis: ['redis://localhost:6379'],
      hooks: {
        name: () => '333'
      }
    })

    await delay(2000)
    const dataList = await pubsub.request('name')
    expect(dataList).toMatchInlineSnapshot(`
Array [
  "123",
  "333",
  "222",
]
`)

    pubsub.clear()
    x.clear()
    y.clear()
  })
  it.skip('should cluster redis nodes', async function () {
    const pubsub = new RedisPubSub({
      uid: '1',
      redis: 'redis://127.0.0.1:6380,redis://127.0.0.1:6381,redis://127.0.0.1:6382',
      hooks: {
        name: () => '123'
      }
    })

    // 2
    const x = new RedisPubSub({
      uid: '2',
      redis: 'redis://127.0.0.1:6380,redis://127.0.0.1:6381,redis://127.0.0.1:6382',
      hooks: {
        name: () => '222'
      }
    })

    // 3
    const y = new RedisPubSub({
      uid: '3',
      redis: 'redis://127.0.0.1:6380,redis://127.0.0.1:6381,redis://127.0.0.1:6382',
      hooks: {
        name: () => '333'
      }
    })

    await delay(2000)
    const dataList = await pubsub.request('name')
    expect(dataList).toMatchInlineSnapshot(`
Array [
  "123",
  "333",
  "222",
]
`)

    pubsub.clear()
    x.clear()
    y.clear()
  })

  it('should single nodes', async function () {
    const pubsub = new RedisPubSub({
      uid: '1',
      redis: ['redis://localhost:6379'],
      hooks: {
        name: () => '123'
      }
    })

    await delay(2000)
    const dataList = await pubsub.request('name')
    expect(dataList).toMatchInlineSnapshot(`
Array [
  "123",
]
`)
    pubsub.clear()
  })
})
