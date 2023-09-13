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

    this._config = config
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
   * @param {string} name
   */
  _normalizeField (name) {
    if (name.startsWith('/')) name = name.slice(1)

    const field = this._config.fields?.find(field => field.name === name)
    const path = this._normalizePath(field?.main || (FEED_PATH + name))

    return path
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
   * Creates or updates a field in the feed
   *
   * @param {string} name
   * @param {string | number | null | boolean | Array | Object | Uint8Array} value - Uint8Array or a utf8 string
   */
  async put (name, value) {
    return this._client.put(this._normalizeField(name), Feed.encode(value))
  }

  /**
   * Read local field
   *
   * @param {string} name
   * @returns {Promise<Uint8Array | null>}
   */
  async get (name) {
    return this._client.get(this._normalizeField(name))
  }

  /**
  * Deletes a field in the feed directory
  *
  * @param {string} name
  * @returns {Promise<void>}
  */
  async del (name) {
    return this._client.del(this._normalizeField(name))
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
 *    description?: string,
 *    main: string,
 *    files?: { [name: string]: string },
 *    [key: string]: any
 *  }>
 *  [key: string]: any
 * }} Config
 */
