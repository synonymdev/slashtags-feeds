const os = require('os')
const path = require('path')
const fs = require('fs')
const sodium = require('sodium-universal')
const b4a = require('b4a')
const Corestore = require('corestore')
const Hyperswarm = require('hyperswarm')
const Hyperdrive = require('hyperdrive')

const DEFAULT_PATH = path.join(os.homedir(), '.slashtags-feeds')

module.exports = class Feeds {
  /**
   *
   * @param {string} storage
   * @param {Header} [header]
   * @param {any} [opts] hyperswarm options
   */
  constructor (storage = DEFAULT_PATH, header = {}, opts) {
    this.corestore = new Corestore(storage)
    this.swarm = new Hyperswarm(opts)
    this.swarm.on('connection', (socket) => this.corestore.replicate(socket))
    this._storage = storage
    this.header = header
    this.drives = new Map()

    this._opening = this._open()
  }

  static FEED_PREFIX = '/feed'
  static HEADER_PATH = '/slashfeed.json'

  async ready () {
    return this._opening
  }

  async _open () {
    await this.corestore.ready()
  }

  async close () {
    for (const drive of this.drives.values()) await drive.close()
    await this.corestore.close()
    return this.swarm.destroy()
  }

  /**
   * Generates a new feed id
   * @returns {string}
   */
  randomID () {
    return b4a.toString(randomBytes(), 'hex')
  }

  /**
   * Creates a feed if it doesn't exist.
   * Returns the drive's key and encryptionKey.
   * It also sets up the discovery and waits till its announced as server.
   *
   * @param {string} feedID
   * @param {object} [opts]
   * @param {boolean} [opts.announce]
   */
  async feed (feedID, opts = {}) {
    const drive = await this._drive(feedID)
    await drive.ready()
    if (opts?.announce !== false) {
      await this.swarm.join(drive.discoveryKey, { server: true, client: false }).flushed()
    }

    const headerContent = Buffer.from(JSON.stringify(this.header))
    await this.ensureFile(feedID, Feeds.HEADER_PATH, headerContent)

    return {
      key: drive.key,
      encryptionKey: drive.core.encryptionKey
    }
  }

  _drive (feedID) {
    const drive = this.drives.get(feedID)
    if (drive) return drive

    const ns = this.corestore.namespace(feedID)
    const _preload = ns._preload.bind(ns)
    ns._preload = (opts) => Feeds._preload.bind(this)(opts, _preload, ns._namespace)
    const hyperdrive = new Hyperdrive(ns)
    this.drives.set(feedID, hyperdrive)
    hyperdrive.on('close', () => this.drives.delete(feedID))

    return hyperdrive
  }

  /**
   * Adds encryption key to hypercores before Hyperdrive.ready()
   *
   * @param {any} opts options for creating hypercore
   * @param {any} preload Original Corestore preload function
   * @param {any} ns Corestore's namespace
   */
  static async _preload (opts, preload, ns) {
    // Get keyPair programatically from name
    const { from } = await preload(opts)
    // Add encryption keys for non public drives
    const encryptionKey = hash(ns)
    return { from, encryptionKey }
  }

  /**
   * Updates an entry
   * @param {string} feedID
   * @param {string} key
   * @param {SerializableItem} value
   */
  async update (feedID, key, value) {
    const drive = await this._drive(feedID)
    return drive.put(
      path.join(Feeds.FEED_PREFIX, key),
      Buffer.from(JSON.stringify(value))
    )
  }

  /**
   *
   * @param {string} feedID
   * @param {string} key
   * @returns {Promise<SerializableItem | null>}
   */
  async get (feedID, key) {
    const drive = await this._drive(feedID)
    const block = await drive.get(path.join(Feeds.FEED_PREFIX, key))
    if (!block) return null
    return JSON.parse(block.toString())
  }

  /**
  * Deletes an old file that is not needed any more
  * @param {} feedID
  * @param {*} key
  */
  async deleteFile (feedID, key) {
    const drive = await this._drive(feedID)
    await drive.del(key)
  }

  /**
 * Ensures a file exists and writes it if missing or out of date
 * Returns true if the file was missing and needed to be written
 * @param {string} feedID
 * @param {string} key
 * @param {SerializableItem} value
 */
  async ensureFile (feedID, key, data) {
    const drive = await this._drive(feedID)
    const batch = drive.batch()
    const existing = await batch.get(key)
    if (existing && existing.equals(data)) {
      await batch.flush()
      return false
    }

    await batch.put(key, data)
    await batch.flush()
    return true
  }

  /**
   * Delete the feed from storage
   * @param {string} feedID
   */
  async destroy (feedID) {
    const drive = await this._drive(feedID)
    await drive.ready()
    return this._destroyDrive(drive)
  }

  _destroyDrive (drive) {
    const cores = [drive.core, drive.blobs.core]
    return Promise.allSettled(cores.map(this._destroyCore.bind(this)))
  }

  async _destroyCore (core) {
    if (typeof this._storage !== 'string') return // Not on disk
    const id = core.discoveryKey.toString('hex')
    const dir = path.join(
      this._storage,
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
 * Returns "n" number of random bytes.
 * @param {number} n
 * @returns
 */
function randomBytes (n = 32) {
  const buf = b4a.alloc(n)
  sodium.randombytes_buf(buf)
  return buf
}

/**
 * Hashes an input using Blake2b
 * @param {Buffer} input
 * @returns
 */
function hash (input) {
  const output = b4a.alloc(32)
  sodium.crypto_generichash(output, input)
  return output
}

/**
 * @typedef { string | null | number | boolean } SerializableItem
 * @typedef {Array<SerializableItem> | Record<string, SerializableItem>} JSONObject
 * @typedef {SerializableItem | Array<SerializableItem | JSONObject> | Record<string, SerializableItem | JSONObject>} JSON
 * @typedef {{
 *  name?: string,
 *  image?: string,
 *  [key:string]: any
 * }} Header
 */
