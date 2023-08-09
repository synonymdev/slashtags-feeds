const SlashURL = require('@synonymdev/slashtags-url')

const Feed = require('./writer.js')

class Reader {
  /**
   * @param {WebRelayClient} client
   * @param {string} url - slashfeed:<userID>/<feedName>?relay=<relayAddress>
   */
  constructor (client, url) {
    this._client = client

    this._parsed = SlashURL.parse(url)
    this._config = null
  }

  _createURL (path) {
    return SlashURL.format(this._parsed.key, {
      path: this._parsed.path + path,
      fragment: this._parsed.fragment,
      query: this._parsed.query
    })
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
   * @param {string} key
   * @param {(buf: Uint8Array) => T} [decode]
   *
   * @returns {Promise<T | null>}
   */
  async getField (key, decode = Feed._decode) {
    const config = await this.getConfig()
    if (!config) return

    const path = config.fields?.[key]?.main || '/feed/' + key

    const url = this._createURL(path)

    const buf = await this._client.get(url)

    if (!buf) return null

    return decode(buf)
  }
}

module.exports = Reader

/**
 * @typedef {import('@synonymdev/web-relay/types/lib/client/index')} WebRelayClient
 * @typedef {import('./writer').Config} Config
 */
