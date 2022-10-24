const Feeds = require('../index.js')
const test = require('brittle')
const fs = require('fs')
const path = require('path')
const os = require('os')
const RAM = require('random-access-memory')
const Hyperswarm = require('hyperswarm')
const Hyperdrive = require('Hyperdrive')
const Corestore = require('corestore')

const storage = path.join(
  os.tmpdir(),
  'slashtags-feeds-test' + Math.random().toString(16).slice(2)
)

class EphemeralFeeds extends Feeds {
  constructor () {
    // @ts-ignore
    super(() => new RAM())
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
  const feeds = new Feeds()

  const feed = await feeds.feed('foo')
  t.is(
    feed.key.toString('hex'),
    'b5fd1f1df9204f61ab6f5741a1471f14ee1541c833f2233258e4ee3f59a65dbe'
  )
  t.is(
    feed.encryptionKey.toString('hex'),
    'b832ffb1a40310381609735b785fa56ba674fc1c6887ff0aa8e3f276f7784d50'
  )
  const feed2 = await feeds.feed('bar')
  t.is(
    feed2.key.toString('hex'),
    '7843365d5054795fd61238f8fd1d6c534ca7abd17913705911b3a074ce45171d'
  )
  t.is(
    feed2.encryptionKey.toString('hex'),
    'fe4261f4db6d26357fb2c11962a8b74baf90b594647f36960d6317c77aa1c00f'
  )

  feeds.close()
})

test('should be able to read data from feeds', async (t) => {
  const feeds = new Feeds(storage)
  const id = feeds.randomID()

  await feeds.update(id, 'foo', 'bar')

  t.is(await feeds.get(id, 'foo'), 'bar')

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
  const feeds = new Feeds(storage)
  const feed = await feeds.feed('234')

  t.ok(feed.key.length === 32)
  t.ok(feed.encryptionKey.length === 32)

  await feeds.update('234', 'foo', 'bar')

  // Read feed
  const swarm = new Hyperswarm()
  const corestore = new Corestore(RAM)
  swarm.on('connection', (socket) => corestore.replicate(socket))

  const drive = new Hyperdrive(corestore, feed.key, {
    encryptionKey: feed.encryptionKey
  })
  await drive.ready()
  swarm.join(drive.discoveryKey, { client: true, server: false })
  const done = drive.findingPeers()
  swarm.flush().then(done, done)
  await drive.update()

  const result = (await drive.get('/feed/foo'))?.toString()

  t.is(result, '"bar"')

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
