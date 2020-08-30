/**
 * redis pubsub for communicating others
 * @author imcuttle
 */

declare type RedisPubSubConfig = {
  pub?: any
  sub?: any
  redis?: any
  uid?: string
  hooks?: { [name: string]: Function }
  createClient?: (redisConfig: any) => any
  getNumSub?: (channel: string, pub: any) => number
  timeout?: number
  requestChannel?: string
  responseChannel?: string
}

declare class RedisPubSub {
  static defaultCreateClient: (redisConfig: any) => any
  static defaultGetNumSub: (channel: string, pub: any) => Promise<number>
  constructor(config: RedisPubSubConfig)
  setHook(name: string, fn: Function)
  clear()
  quit()
  request: (name: string, ...args: any[]) => Array<any>
}

export = RedisPubSub
