const b4a = require('b4a')
const SlashURL = require('@synonymdev/slashtags-url')

const CONFIG_PATH = '/slashfeed.json'
const FEED_PATH = '/feed/'

class Feed {
  /**
   * @param {WebRelayClient} client
   * @param {Config} config
   * @param {object} [opts]
   * @param {Uint8Array} [opts.icon]
   */
  constructor (client, config, opts = {}) {
    this._client = client
    this._dir = config.name

    if (!this._client) throw new Error('Missing client')
    if (!this._dir) throw new Error('Missing feed name')

    this._opened = this._saveConfig(config, opts.icon)

    const parsed = SlashURL.parse(this._client.url)
    this._url = SlashURL.format(parsed.key, {
      protocol: 'slashfeed:',
      path: this._dir,
      query: parsed.query,
      fragment: parsed.fragment
    })
  }

  [Symbol.for('nodejs.util.inspect.custom')] () {
    return this.constructor.name + ' ' + JSON.stringify({
      url: this.url
    }, null, 4)
  }

  get url () {
    return this._url
  }

  async ready () {
    return this._opened
  }

  /**
   * @param {string} path
   */
  _normalizePath (path) {
    path = path.startsWith('/') ? path : '/' + path
    return this._dir + path
  }

  /**
   * Ensures that a config file `/slashfee.json` exists or creates it if not.
   *
   * @param {Config} [config]
   * @param {Uint8Array} [icon]
   */
  async _saveConfig (config, icon) {
    if (!config) return
    const iconPath = (config.icons && Object.values(config.icons)[0]) || 'default'

    return Promise.all([
      this._client.put(this._normalizePath(CONFIG_PATH), Feed.encode(config)),
      icon && this._client.put(this._normalizePath(iconPath), icon)
    ])
  }

  /**
   * Creates or updates an entry in the feed
   *
   * @param {string} key
   * @param {string | number | null | boolean | Array | Object | Uint8Array} value - Uint8Array or a utf8 string
   */
  async put (key, value) {
    if (key.startsWith('/')) key = key.slice(1)

    return this._client.put(
      this._normalizePath(FEED_PATH + key),
      Feed.encode(value)
    )
  }

  /**
   * Read local entry
   *
   * @param {string} key
   * @returns {Promise<Uint8Array | null>}
   */
  async get (key) {
    if (key.startsWith('/')) key = key.slice(1)

    return this._client.get(this._normalizePath(FEED_PATH + key))
  }

  /**
  * Deletes an entry in the feed directory
  *
  * @param {string} path
  * @returns {Promise<void>}
  */
  async del (path) {
    return this._client.del(this._normalizePath(path))
  }

  async close () {
    return this._client.close()
  }

  /**
   * Encode a serializable into a Uint8Array
   *
   * @param {string | number | null | boolean | Array | Object | Uint8Array} value
   * @returns {Uint8Array}
   */
  static encode (value) {
    if (b4a.isBuffer(value)) return value

    try {
      return b4a.from(JSON.stringify(value))
    } catch { }
  }

  /**
   * Decode a value from a buffer assuming it is a utf8 string or JSON
   *
   * @param {Uint8Array | string} value
   */
  static decode (value) {
    try {
      return JSON.parse(b4a.toString(value))
    } catch { }

    return value
  }
}

module.exports = Feed

/**
 * @typedef {import('@synonymdev/web-relay/types/lib/client/index')} WebRelayClient
 * @typedef {{
 *  name: string,
 *  description?: string,
 *  icons?: { [size: string]: string },
 *  type?: string,
 *  version?: string,
 *  fields?: Array<{
 *    name: string,
 *    description?: "Bitcoin / US Dollar price history",
 *    main: "/feed/BTCUSD-last",
 *    files?: { [name: string]: string },
 *    [key: string]: any
 *  }>
 *  [key: string]: any
 * }} Config
 */
