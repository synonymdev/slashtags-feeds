const os = require('os')
const path = require('path')

const SLASHTAG_NAME = 'slashtags-feed-provider'
const DEFAULT_PATH = path.join(os.homedir(), '.slashtags-feeds')

module.exports = class Feeds {
  /**
   *
   * @param {object} opts
   * @param {Uint8Array} [opts.key] Secret key
   * @param {string} [opts.storage] Storage directory
   */
  constructor (opts = {}) {
    this._opts = opts
  }

  /**
   * @param {ConstructorParameters<typeof Feeds>[0]} opts
   */
  static async init (opts = {}) {
    const feeds = new Feeds(opts)
    await feeds.ready()
    return feeds
  }

  async ready () {
    const { SDK } = await import('@synonymdev/slashtags-sdk')
    const sdk = new SDK({
      primaryKey: this._opts.key,
      storage: this._opts.storage || DEFAULT_PATH,
      persist: this._opts.persist
    })
    const slashtag = sdk.slashtag({ name: SLASHTAG_NAME })

    this.sdk = sdk
    this.slashtag = slashtag
    this._key = sdk.primaryKey // If this._key was falsy

    await slashtag.ready()
  }

  close () {
    this.closed = true
    return this.sdk.close()
  }

  /**
   * Creates a feed for a user's ID if it doesn't exist.
   * Returns the feed key and encryptionKey.
   *
   * @param {{toString(): string}} userID
   */
  async feed (userID) {
    const drive = await this._drive(userID)

    return {
      key: drive.key,
      encryptionKey: drive.encryptionKey
    }
  }

  async _drive (userID) {
    if (this.closed) {
      throw new Error('Can not create feeds after closing the SDK')
    }

    const drive = await this.slashtag.drive({
      name: userID.toString(),
      encrypted: true
    })

    return drive
  }

  /**
   *
   * @param {{toString(): string}} userID
   * @param {string} key
   * @param {JSON} value
   */
  async update (userID, key, value) {
    const drive = await this._drive(userID)
    drive.put(key, this._encode(value))
  }

  _encode (value) {
    return Buffer.from(JSON.stringify(value))
  }
}

/**
 * @typedef { string | null | number | boolean } SerializableItem
 * @typedef {Array<SerializableItem> | Record<string, SerializableItem>} JSONObject
 * @typedef {SerializableItem | Array<SerializableItem | JSONObject> | Record<string, SerializableItem | JSONObject>} JSON
 */
