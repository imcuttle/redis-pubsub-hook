/* eslint-disable */
const { RedisPubSub, NamespacePubSub } = require('..')

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

  it('redis single node', async function () {
    const pubsub = new RedisPubSub({
      uid: '1',
      redis: ['redis://localhost:6379'],
      hooks: {
        name: () => '123'
      }
    })

    const pubsub2 = new RedisPubSub({
      uid: '2',
      redis: ['redis://localhost:6379'],
      hooks: {
        name: () => '234'
      }
    })

    await delay(2000)

    const dataList = await pubsub.request('name')
    expect(dataList).toMatchInlineSnapshot(`
      Array [
        "123",
        "234",
      ]
    `)
    pubsub.quit()
    pubsub2.quit()
  })

  it('NamespacePubSub', async function () {
    const namespacePubSub = new NamespacePubSub({
      redis: ['redis://localhost:6379']
    })

    namespacePubSub.register('1 nsp')
    namespacePubSub.setHook('1 nsp', 'name', () => '1 name')

    namespacePubSub.register('2 nsp')
    namespacePubSub.setHook('2 nsp', 'name', () => '2 name')

    const nsp2 = new NamespacePubSub({
      redis: ['redis://localhost:6379']
    })

    await delay(2000)

    nsp2.register('1 nsp').setHook('name', () => '1 name other')

    expect(await nsp2.request('name')).toMatchInlineSnapshot(`
      Object {
        "1 nsp": Array [
          "1 name other",
          "1 name",
        ],
      }
    `)

    const data = await namespacePubSub.request('name')
    expect(data).toMatchInlineSnapshot(`
      Object {
        "1 nsp": Array [
          "1 name",
          "1 name other",
        ],
        "2 nsp": Array [
          "2 name",
        ],
      }
    `)

    namespacePubSub.quit()
    nsp2.quit()
  })
})
