const RedisPubSub = require('./RedisPubSub')

class NamespacedPubSub {
  static defaultCreateClient = RedisPubSub.defaultCreateClient

  constructor({ redis, pub, sub, createClient = this.constructor.defaultCreateClient, ...config } = {}) {
    this.pub = pub || createClient(redis)
    this.sub = sub || createClient(redis)
    this.map = new Map()
    this.config = config
  }

  register(namespace) {
    if (this.map.get(namespace)) {
      return this.map.get(namespace)
    }
    this.map.set(
      namespace,
      new RedisPubSub({
        requestChannel: `RequestChannel#${namespace}`,
        responseChannel: `ResponseChannel#${namespace}`,
        pub: this.pub,
        sub: this.sub,
        ...this.config
      })
    )
    return this.map.get(namespace)
  }

  getPubSub(namespace) {
    return this.map.get(namespace)
  }

  setHook(nsp, name, fn) {
    const pubsub = this.map.get(nsp)
    if (pubsub) {
      pubsub.setHook(name, fn)
    }
  }

  async request(type, ...args) {
    const result = {}
    const tasks = []
    for (const [nsp, pubsub] of this.map.entries()) {
      tasks.push(async () => {
        const output = await pubsub.request(type, args)
        result[nsp] = output
      })
    }

    await Promise.all(tasks.map((fn) => fn()))
    return result
  }

  remove(namespace) {
    const pubsub = this.map.get(namespace)
    if (pubsub) {
      pubsub.clear()
    }
    this.map.delete(namespace)
  }

  clear() {
    for (const pubsub of this.map.values()) {
      pubsub.clear()
    }
  }

  quit() {
    for (const pubsub of this.map.values()) {
      pubsub.quit()
    }
  }
}

module.exports = NamespacedPubSub
