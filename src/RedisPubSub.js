/**
 * redis 发布订阅模式，实现多节点通信
 *
 * 首先订阅 client 会订阅，request / response 两个信道（channel）
 * redis(request)  <-  sub
 * redis(response) <-  sub
 *
 * 以一次触发广播的场景为例
 * 1. A 节点的 pub 会在 request 信道上发布消息，{ type: 'broadcast', uid: 'A_UUID', value: '...' }
 *
 * 2. A/B 节点的 sub 会在 request 信道上，接受到该消息，通过 uid 判断请求来源，过滤掉 A 节点本身，在 B 节点触发 broadcast，
 *    并且在 response 信道上，发出 { uid: 'A_UUID', res: 'B节点执行 broadcast 的返回结果' } 消息
 *
 * 3. A/B 节点的 sub 都会接受到 response 信道的数据，通过 uid 判断是响应给 A 节点的，所以 A 获取到消息，
 *    同时 A 获取信道的总共被订阅数量，然后把所有返回的数据拼接成 长度为订阅数量的数组
 *
 * 根据以上的逻辑，所以我们传递的数据需要是可以被序列化的/反序列化回来的
 *
 */
const RedisClustr = require('redis-clustr')
const { createClient, RedisClient } = require('redis')
const uuid = require('uuid').v4
const { parse } = require('url')

// 获取信道的总共被订阅数量
function defaultGetNumSub(channel, pub) {
  // RedisClustr
  if (pub instanceof RedisClustr) {
    const ps = Object.keys(pub.connections).map((name) => {
      const con = pub.connections[name]
      return getNumSub(channel, con)
    })
    return Promise.all(ps).then((numList) => {
      // console.log('numList', numList)
      return numList.reduce((acc, n) => acc + n)
    })
  }

  if (pub.constructor.name !== 'Cluster') {
    // RedisClient or Redis
    return new Promise(function (resolve, reject) {
      pub.send_command('pubsub', ['numsub', channel], function (err, numsub) {
        if (err) return reject(err)
        resolve(parseInt(numsub[1], 10))
      })
    })
  } else {
    // Cluster
    const nodes = pub.nodes()
    return Promise.all(
      nodes.map(function (node) {
        return node.send_command('pubsub', ['numsub', channel])
      })
    ).then(function (values) {
      let numsub = 0
      values.map(function (value) {
        numsub += parseInt(value[1], 10)
      })
      return numsub
    })
  }
}

const defaultCreateClient = (redisServers) => {
  if (redisServers instanceof RedisClustr || redisServers instanceof RedisClient) {
    return redisServers
  }

  if (typeof redisServers === 'string') {
    redisServers = redisServers.split(',')
  }

  if (Array.isArray(redisServers)) {
    redisServers = redisServers.map((url) => {
      if (typeof url !== 'string') {
        return url
      }
      const obj = parse(url)
      return {
        port: obj.port,
        host: obj.hostname
      }
    })
  } else {
    return createClient(redisServers)
  }

  if (redisServers.length > 1) {
    return new RedisClustr(redisServers)
  } else {
    return createClient(redisServers[0])
  }
}

class RedisPubSub {
  static defaultCreateClient = defaultCreateClient
  static defaultGetNumSub = defaultGetNumSub

  constructor({
    pub,
    sub,
    redis,
    uid = uuid(),
    hooks,
    createClient = this.constructor.defaultCreateClient,
    getNumSub = this.constructor.defaultGetNumSub,
    // 超时 ms 时间
    timeout = 3000,
    requestChannel = 'RequestChannel',
    responseChannel = 'ResponseChannel'
  } = {}) {
    this.requestChannel = requestChannel
    this.responseChannel = responseChannel
    this.hooks = hooks || {}
    this.timeout = timeout
    this.getNumSub = getNumSub
    this.uid = uid
    this.pub = pub || createClient(redis)
    this.sub = sub || createClient(redis)

    this.sub.subscribe([this.responseChannel, this.requestChannel])
    this.onRequest = this.onRequest.bind(this)
    this.sub.on('message', this.onRequest)
  }

  async _runHook(source, type, args = []) {
    if (this.hooks.hasOwnProperty(type)) {
      const hook = this.hooks[type]
      return await hook.apply(null, [source].concat(args))
    } else {
      console.error('Hook: ', type, 'not found!')
    }
  }

  async onRequest(channel, data) {
    if (channel === this.requestChannel) {
      const { type, args, uid } = JSON.parse(data)
      if (this.uid === uid) {
        return
      }

      const output = await this._runHook('remote', type, args)
      this.pub.publish(this.responseChannel, JSON.stringify({ res: output, uid }))
    }
  }

  async request(type, ...args) {
    let resolve
    let timer
    // 本地节点则不需要通过 redis pubsub，直接本地执行即可
    const resList = [await this._runHook('local', type, args)]

    const numSub = await this.getNumSub(this.responseChannel, this.pub)
    // console.log('numSub', numSub, this.responseChannel)
    if (resList.length === numSub) {
      return resList
    }

    const onRequest = async (channel, data) => {
      if (channel === this.responseChannel) {
        // console.log('received responseChannel', data);
        const { res, uid } = JSON.parse(data)
        if (this.uid !== uid) {
          return
        }

        resList.push(res)
        if (resList.length === numSub) {
          resolve(resList)
        }
      }
    }

    this.sub.on('message', onRequest)
    this.pub.publish(this.requestChannel, JSON.stringify({ type, args, uid: this.uid }))

    return new Promise((solve) => {
      resolve = solve
      timer = setTimeout(() => {
        resolve(resList)
      }, this.timeout)
    }).finally(() => {
      clearTimeout(timer)
      this.sub.off('message', onRequest)
    })
  }

  setHook(name, fn) {
    this.hooks[name] = fn
  }

  clear() {
    this.sub.off('message', this.onRequest)
    this.sub.unsubscribe([this.requestChannel, this.responseChannel])
    this.pub.unsubscribe([this.requestChannel, this.responseChannel])
  }

  quit() {
    this.clear()
    this.sub.quit()
    this.pub.quit()
  }
}

module.exports = RedisPubSub
