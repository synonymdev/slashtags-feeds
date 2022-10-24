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
   */
  constructor (storage = DEFAULT_PATH, header = {}) {
    this.corestore = new Corestore(storage)
    this.swarm = new Hyperswarm()
    this.swarm.on('connection', (socket) => this.corestore.replicate(socket))
    this._storage = storage
    this.header = header
    this.drives = []
  }

  static FEED_PREFIX = '/feed'
  static HEADER_PATH = '/slashfeed.json'

  async close () {
    // close the drives (one at a time)
    for (let i = 0; i < this.drives.length; i += 1) {
      await this.drives[i].hyperdrive.close()
    }
    this.drives = []

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
      await this.swarm.join(drive.discoveryKey).flushed()
    }

    const headerContent = Buffer.from(JSON.stringify(this.header))
    await this.ensureFile(feedID, Feeds.HEADER_PATH, headerContent)

    return {
      key: drive.key,
      encryptionKey: drive.core.encryptionKey
    }
  }

  _drive (feedID) {
    const drive = this.drives.find((d) => d.feedID === feedID)
    if (drive) {
      return drive.hyperdrive
    }

    // don't have this one yet, make it
    const namespace = this.corestore.namespace(feedID)
    const encryptionKey = hash(namespace._namespace)
    const hyperdrive = new Hyperdrive(namespace, { encryptionKey })
    this.drives.push({ feedID, hyperdrive })

    return hyperdrive
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
