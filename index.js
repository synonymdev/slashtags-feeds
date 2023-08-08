const b4a = require('b4a')

const CONFIG_PATH = '/slashfeed.json'

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
  }

  /**
   * @param {string} path - path to the file in this feed
   */
  async createURL (path = '') {
    const url = await this._client.createURL(this._normalizePath(path))
    return url.replace('slash:', 'slashfeed:')
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
      this._client.put(this._normalizePath(CONFIG_PATH), Feed._encode(config)),
      icon && this._client.put(this._normalizePath(iconPath), icon)
    ])
  }

  /**
   * Creates or updates an entry in the feed directory
   *
   * @param {string} path
   * @param {Uint8Array | string} value - Uint8Array or a utf8 string
   */
  async put (path, value) {
    return this._client.put(
      this._normalizePath(path),
      Feed._encode(value)
    )
  }

  /**
   * Read local data
   *
   * @param {string} path
   * @returns {Promise<Uint8Array | null>}
   */
  async get (path) {
    return this._client.get(this._normalizePath(path))
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
   * Encode a value into a buffer assuming it is a utf8 string or JSON
   *
   * @param {string | object} value
   */
  static _encode (value) {
    if (typeof value !== 'string' && !b4a.isBuffer(value)) {
      try {
        // Assume it is a JSON
        value = JSON.stringify(value)
      } catch { }
    }

    return b4a.from(value)
  }

  /**
   * Decode a value from a buffer assuming it is a utf8 string or JSON
   *
   * @param {Uint8Array} value
   */
  static _decode (value) {
    const string = b4a.toString(value)

    try {
      return JSON.parse(string)
    } catch { }

    return string
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
