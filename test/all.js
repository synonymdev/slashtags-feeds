const Feeds = require('../index.js')
const test = require('brittle')
const fs = require('fs')
const path = require('path')
const os = require('os')
const RAM = require('random-access-memory')
const Hyperswarm = require('hyperswarm')
const Hyperdrive = require('Hyperdrive')
const Corestore = require('corestore')
const createTestnet = require('@hyperswarm/testnet')
const b4a = require('b4a')

const storage = path.join(
  os.tmpdir(),
  'slashtags-feeds-test' + Math.random().toString(16).slice(2)
)

class EphemeralFeeds extends Feeds {
  constructor (opts) {
    // @ts-ignore
    super(() => new RAM(), {}, opts)
  }
}

test('generate new random key', async (t) => {
  const feeds = new EphemeralFeeds()
  const key = feeds.randomID()

  t.is(typeof key === 'string', true)
  t.is(key.length === 64, true)
  t.is(key !== feeds.randomID(), true)

  feeds.close()
})

test('deterministic keys', async (t) => {
  const feeds = new Feeds('./test/storage')

  const feed = await feeds.feed('foo')
  t.snapshot(feed.key.toString('hex'))
  t.snapshot(feed.encryptionKey.toString('hex'))
  const feed2 = await feeds.feed('bar')
  t.snapshot(feed2.key.toString('hex'))
  t.snapshot(feed2.encryptionKey.toString('hex'))

  feeds.close()
})

test('should be able to read data from feeds', async (t) => {
  const feeds = new Feeds(storage)
  const id = feeds.randomID()

  await feeds.update(id, 'foo', 'bar')

  t.alike(await feeds.get(id, 'foo'), b4a.from('bar'))

  await feeds.close()
})

test('ensureFile', async (t) => {
  const feeds = new Feeds(storage)
  await feeds.ready()
  const id = feeds.randomID()

  await feeds.ensureFile(id, Feeds.FEED_PREFIX + '/foo', 'bar')

  t.alike(await feeds.get(id, 'foo'), b4a.from('bar'))

  await feeds.close()
})

test('should be able to delete a drive from storage', async (t) => {
  const feeds = new Feeds(storage)
  const key = feeds.randomID()

  const drive = await feeds._drive(key)
  const other = await feeds._drive(feeds.randomID())

  await feeds.update(key, 'foo', 'bar')
  await feeds.update(key, 'foo2', 'bar2')

  t.is(storageExists(drive), true)
  t.is(storageExists(other), true)

  await feeds.destroy(key)

  t.is(storageExists(drive), false)
  t.is(storageExists(other), true)

  await feeds.close()
})

test('replication', async (t) => {
  const testnet = await createTestnet(3, t.teardown)
  const feeds = new EphemeralFeeds(testnet)
  const feed = await feeds.feed('234')

  t.ok(feed.key.length === 32)
  t.ok(feed.encryptionKey.length === 32)

  await feeds.update('234', 'foo', 'bar')

  // Read feed
  const swarm = new Hyperswarm(testnet)
  const corestore = new Corestore(RAM)
  swarm.on('connection', (socket) => corestore.replicate(socket))

  const _preload = corestore._preload.bind(corestore)
  corestore._preload = (opts) => _customPreload.bind(this)(opts, _preload, feed.encryptionKey)

  async function _customPreload (opts, preload, encryptionKey) {
    const { from } = await preload(opts)
    return { from, encryptionKey }
  }

  const drive = new Hyperdrive(corestore, feed.key)
  await drive.ready()

  swarm.join(drive.discoveryKey, { client: true, server: false })
  const done = drive.findingPeers()
  swarm.flush().then(done, done)
  await drive.update()

  const result = (await drive.get('/feed/foo'))?.toString()

  t.is(result, 'bar')

  await feeds.close()
  await swarm.destroy()
})

test('metadata', async (t) => {
  const header = { name: 'foo' }
  const feeds = new Feeds(storage, header)
  const key = feeds.randomID()
  const drive = await feeds._drive(key)
  await feeds.feed(key, { announce: false }) // add metadata before sharing

  const savedHeader = await drive.get('/slashfeed.json').then((buf) => {
    return buf && JSON.parse(buf.toString())
  })

  t.is(JSON.stringify(savedHeader), JSON.stringify(header))
  await feeds.close()

  // Modify metadata
  {
    const header = { name: 'bar' }
    const feeds = new Feeds(storage, header)
    const drive = await feeds._drive(key)
    await feeds.feed(key, { announce: false })

    const savedHeader = await drive.get('/slashfeed.json').then((buf) => {
      return buf && JSON.parse(buf.toString())
    })

    t.is(JSON.stringify(savedHeader), JSON.stringify(header))
    await feeds.close()
  }
})

test('deduplicate drives', async (t) => {
  const feeds = new EphemeralFeeds()

  const a = feeds._drive('foo')
  const b = feeds._drive('foo')

  t.is(a, b)

  const c = feeds._drive('bar')
  t.is(feeds.drives.size, 2) // create new drive
  await c.close()
  t.is(feeds.drives.size, 1, 'should remove drive frome feeds.drives after close')

  await feeds.close()
  t.is(feeds.drives.size, 0, 'should remove all drives after close')
})

test('encoding - old', (t) => {
  const string = 'Foo'
  const encodedString = Feeds._oldEncode(string)
  t.is(oldDecoder(encodedString), `"${string}"`, 'decode strings')

  const number = 42
  const encodedNumber = Feeds._oldEncode(number)
  t.is(oldDecoder(encodedNumber), `${number}`, 'decode number')

  const json = { foo: 'bar' }
  const encodedJson = Feeds._oldEncode(json)
  t.is(oldDecoder(encodedJson), JSON.stringify(json), 'decode json')
})

test('encoding - new', (t) => {
  const string = 'Foo'
  const encodedString = Feeds._encode(string)
  t.is(oldDecoder(encodedString), string, 'decode strings')

  const uint = 'Foo'
  const encodedUint = Feeds._encode(b4a.from(uint))
  t.is(oldDecoder(encodedUint), uint, 'decode Uint')
})

function oldDecoder (buf) {
  return buf && b4a.toString(buf).slice(0, 35)
}

function storageExists (drive) {
  const cores = [drive.core, drive.blobs.core]
  return cores.every((core) => _storageExists(core))
}

function _storageExists (core) {
  try {
    const id = core.discoveryKey.toString('hex')
    const dir = path.join(storage, 'cores', id.slice(0, 2), id.slice(2, 4), id)
    const list = fs.readdirSync(dir)
    return !!list
  } catch (error) {
    return false
  }
}
