# redis-pubsub-hook

[![NPM version](https://img.shields.io/npm/v/redis-pubsub-hook.svg?style=flat-square)](https://www.npmjs.com/package/redis-pubsub-hook)
[![NPM Downloads](https://img.shields.io/npm/dm/redis-pubsub-hook.svg?style=flat-square&maxAge=43200)](https://www.npmjs.com/package/redis-pubsub-hook)
[![Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg?style=flat-square)](https://conventionalcommits.org)

> Redis pubsub for communicating other nodes  
> Using [`node-redis`](https://github.com/NodeRedis/node-redis) and [redis-cluster](https://github.com/gosquared/redis-clustr) client connection driver by default.

## Installation

```bash
npm install redis-pubsub-hook
# or use yarn
yarn add redis-pubsub-hook
```

## Usage

```javascript
const RedisPubsubHook = require('redis-pubsub-hook')
const WebSocket = require('ws')

const wss = new WebSocket.Server({ port: 8080 })

// Create redis connection on every server
const pubsub = new RedisPubsubHook({
  redis: 'redis://localhost:6379' // or `redis://localhost:6379,redis://localhost:6380` cluster
})

// Create self hook
pubsub.setHook('sessions', () => wss.clients.map((socket) => socket.session))

wss.on('connection', async function connection(socket, req) {
  socket.session = req.session

  // Collect all server nodes' responses
  const sessionsList = await pubsub.request('sessions')
})

process.on('SIGINT', () => pubsub.clear())
```

## API

### Options

#### `pub`

Redis Client instance

#### `sub`

Redis Client instance

#### `redis`

The config for creating Redis Client

#### `uid`

The uid of this pubsub

- **Type:** `string`
- **Default:** `uuid()`

#### `hooks`

- **Type:** `{[name: string]: Function}`

#### `createClient`

- **Type:** `(config: any) => RedisClient | RedisCluster`
- **Default:** `RedisPubSub.defaultCreateClient`

#### `getNumSub`

- **Type:** `(channel: string, pub: RedisClient | RedisCluster) => Promise<number>`
- **Default:** `RedisPubSub.defaultGetNumSub`

#### `timeout`

- **Type:** `number`
- **Default:** `3000`

#### `responseChannel`

- **Type:** `string`
- **Default:** `RequestChannel`

#### `requestChannel`

- **Type:** `string`
- **Default:** `ResponseChannel`

## Contributing

- Fork it!
- Create your new branch:  
  `git checkout -b feature-new` or `git checkout -b fix-which-bug`
- Start your magic work now
- Make sure npm test passes
- Commit your changes:  
  `git commit -am 'feat: some description (close #123)'` or `git commit -am 'fix: some description (fix #123)'`
- Push to the branch: `git push`
- Submit a pull request :)

## Authors

This library is written and maintained by imcuttle, <a href="mailto:moyuyc95@gmail.com">moyuyc95@gmail.com</a>.

## License

MIT - [imcuttle](https://github.com/imcuttle) 🐟
