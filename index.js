const os = require('os')
const path = require('path')
const fs = require('fs')
const sodium = require('sodium-universal')
const b4a = require('b4a')

const SLASHTAG_NAME = 'slashtags-feed-provider'
const DEFAULT_PATH = path.join(os.homedir(), '.slashtags-feeds')
const KEY_PATH = 'feeds-key'

module.exports = class Feeds {
  /**
   *
   * @param {object} opts
   * @param {Uint8Array} [opts.key] Secret key
   * @param {string} [opts.storage] Storage directory
   * @param {boolean} [opts.persist]
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

    const key = this._fromStorage()

    const sdk = new SDK({
      primaryKey: key || this._opts.key,
      storage: this._opts.storage || DEFAULT_PATH,
      persist: this._opts.persist
    })
    const slashtag = sdk.slashtag({ name: SLASHTAG_NAME })

    this.sdk = sdk
    this.slashtag = slashtag
    this._key = sdk.primaryKey // If this._key was falsy

    await slashtag.ready()

    if (!key) this._writePrimaryKey(sdk.primaryKey)
  }

  close () {
    this.closed = true
    return this.sdk.close()
  }

  /**
   * Generates a new feed id
   * @returns {string}
   */
  randomID () {
    const buf = b4a.alloc(32)
    sodium.randombytes_buf(buf)
    return b4a.toString(buf, 'hex')
  }

  /**
   * Creates a feed if it doesn't exist.
   * Returns the feed key and encryptionKey.
   *
   * @param {string} feedID
   */
  async feed (feedID) {
    const drive = await this._drive(feedID)

    return {
      key: drive.key,
      encryptionKey: drive.encryptionKey
    }
  }

  /**
   *
   * @param {string} feedID
   * @returns
   */
  async _drive (feedID) {
    if (this.closed) {
      throw new Error('Can not create feeds after closing the SDK')
    }

    const drive = await this.slashtag.drive({
      name: feedID,
      encrypted: true
    })

    return drive
  }

  _fromStorage () {
    try {
      return fs.readFileSync(
        path.join(this._opts.storage || DEFAULT_PATH, KEY_PATH)
      )
    } catch (error) {}
  }

  _writePrimaryKey (key) {
    if (this._opts.persist === false) return
    fs.writeFileSync(
      path.join(this._opts.storage || DEFAULT_PATH, KEY_PATH),
      key
    )
  }

  /**
   *
   * @param {string} feedID
   * @param {string} key
   * @param {JSON} value
   */
  async update (feedID, key, value) {
    const drive = await this._drive(feedID)
    return drive.put(key, this._encode(value))
  }

  /**
   *
   * @param {string} feedID
   * @param {string} key
   */
  async get (feedID, key) {
    const drive = await this._drive(feedID)
    const block = await drive.get(key)
    if (!block) return null
    return this._decode(block)
  }

  /**
   * Delete the feed from storage
   * @param {string} feedID
   */
  async destroy (feedID) {
    if (this._opts.persist === false) return
    const drive = await this._drive(feedID)
    return this._destroyDrive(drive)
  }

  _encode (value) {
    return Buffer.from(JSON.stringify(value))
  }

  _decode (buffer) {
    return JSON.parse(buffer.toString())
  }

  _destroyDrive (drive) {
    const cores = [drive.feed, drive.content.core]
    return Promise.allSettled(cores.map(this._destroyCore.bind(this)))
  }

  async _destroyCore (core) {
    const id = core.discoveryKey.toString('hex')

    const dir = path.join(
      this._opts?.storage || DEFAULT_PATH,
      'cores',
      id.slice(0, 2),
      id.slice(2, 4),
      id
    )

    return Promise.all([
      core.close(),
      new Promise((resolve, reject) =>
        fs.rm(dir, { recursive: true }, (err) => {
          err ? reject(err) : resolve()
        })
      )
    ])
  }
}

/**
 * @typedef { string | null | number | boolean } SerializableItem
 * @typedef {Array<SerializableItem> | Record<string, SerializableItem>} JSONObject
 * @typedef {SerializableItem | Array<SerializableItem | JSONObject> | Record<string, SerializableItem | JSONObject>} JSON
 */
