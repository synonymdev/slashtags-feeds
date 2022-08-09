const os = require('os')
const path = require('path')
const fs = require('fs')
const sodium = require('sodium-universal')
const b4a = require('b4a')
const Corestore = require('corestore')
const Hyperswarm = require('hyperswarm')
const Hyperdrive = require('hyperdrive')
const deepEqual = require('deep-equal')

const DEFAULT_PATH = path.join(os.homedir(), '.slashtags-feeds')

const DATA_DIR = '/data/'
const METADATA_DIR = '/metadata/'

module.exports = class Feeds {
  /**
   *
   * @param {string} storage
   * @param {object} [opts]
   * @param {{[name: string]: JSON}} [opts.metadata]
   */
  constructor (storage = DEFAULT_PATH, opts = {}) {
    this.corestore = new Corestore(storage)
    this.swarm = new Hyperswarm()
    this.swarm.on('connection', (socket) => this.corestore.replicate(socket))
    this._storage = storage
    this.metadata = opts.metadata
  }

  async close () {
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

    await this._ensureMetadata(drive)

    return {
      key: drive.key,
      encryptionKey: drive.core.encryptionKey
    }
  }

  async _ensureMetadata (drive) {
    if (!this.metadata) return
    const batch = drive.batch()
    for (const [key, value] of [...Object.entries(this.metadata)]) {
      const name = path.join(METADATA_DIR, key + '.json')

      const existing = await batch.get(name).then((buf) => {
        return buf && JSON.parse(buf.toString())
      })

      const skip = existing && deepEqual(existing, value)
      if (skip) continue

      await batch.put(name, Buffer.from(JSON.stringify(value)))
    }
    await batch.flush()
  }

  _drive (feedID) {
    const namespace = this.corestore.namespace(feedID)
    const encryptionKey = hash(namespace._namespace)
    const drive = new Hyperdrive(namespace, { encryptionKey })

    return drive
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
      path.join(DATA_DIR, key),
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
    const block = await drive.get(path.join(DATA_DIR, key))
    if (!block) return null
    return JSON.parse(block.toString())
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
 */
