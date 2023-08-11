const SlashURL = require('@synonymdev/slashtags-url')

const Feed = require('./writer.js')

class Reader {
  /**
   * @param {WebRelayClient} client
   * @param {string} url - slashfeed:<userID>/<feedName>?relay=<relayAddress>
   */
  constructor (client, url) {
    this._client = client

    const parsed = SlashURL.parse(encodeURI(url))
    parsed.path = decodeURIComponent(parsed.path)
    this._parsed = parsed
    this._config = null

    // Try to fetch the config as soon as possible.
    this.getConfig()
  }

  _createURL (path) {
    return SlashURL.format(this._parsed.key, {
      path: this._parsed.path + path,
      fragment: this._parsed.fragment,
      query: this._parsed.query
    })
  }

  get config () {
    return this._config
  }

  /**
   * @returns {Promise<Config | null>}
   */
  async getConfig () {
    if (this._config) return this._config

    const configURL = this._createURL('/slashfeed.json')
    const buffer = await this._client.get(configURL)

    if (!buffer) {
      return null
    }

    const decoded = Feed._decode(buffer)

    this._config = decoded

    return this._config
  }

  /**
   * Returns a value from the feed.
   *
   * @template T
   *
   * @param {string} name
   * @param {(buf: Uint8Array) => T} [decode]
   *
   * @returns {Promise<T | null>}
   */
  async getField (name, decode = Feed._decode) {
    const url = this._fieldUrl(name)
    const buf = await this._client.get(url)

    return buf ? decode(buf) : null
  }

  /**
   * Subscribe to a field
   *
   * @template T
   *
   * @param {string} name
   * @param {(value: any) => any} [onupdate]
   * @param {(buf: Uint8Array) => T} [decode]
   *
   * @returns {() => void} unsubscribe function
   */
  subscribe (name, onupdate, decode = Feed._decode) {
    const url = this._fieldUrl(name)

    return this._client.subscribe(url, (buf) => {
      onupdate?.(buf ? decode(buf) : null)
    })
  }

  /**
   * @param {string} name
   * @returns {string}
   */
  _fieldUrl (name) {
    const path = this.config?.fields?.[name]?.main || '/feed/' + name

    return this._createURL(path)
  }
}

module.exports = Reader

/**
 * @typedef {import('@synonymdev/web-relay/types/lib/client/index')} WebRelayClient
 * @typedef {import('./writer').Config} Config
 */
