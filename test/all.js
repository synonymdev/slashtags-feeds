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
    '3ea919d3dd3fc7ba82d24df6a04ca972dcac66a2470e6fbea2008437072214a1'
  )
  t.is(
    feed.encryptionKey.toString('hex'),
    'b832ffb1a40310381609735b785fa56ba674fc1c6887ff0aa8e3f276f7784d50'
  )
  const feed2 = await feeds.feed('bar')
  t.is(
    feed2.key.toString('hex'),
    'c09510a75f0296cc935b9dc3d39bda113d5d9552751722e5ce4e3d2326446173'
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

  const result = (await drive.get('/data/foo'))?.toString()

  t.is(result, '"bar"')

  await feeds.close()
  await swarm.destroy()
})

test('metadata', async (t) => {
  const metadata = {
    profile: { foo: 'bar' },
    schema: { foo: 42 }
  }

  const feeds = new Feeds(storage, { metadata })
  const key = feeds.randomID()

  const drive = await feeds._drive(key)

  await feeds.update(key, 'foo', 'bar')
  await feeds.update(key, 'foo2', 'bar2')

  await feeds.feed(key, { announce: false }) // add metadata before sharing

  const savedMetadata = {}
  const batch = drive.batch()
  for await (const file of drive.readdir('/metadata')) {
    const key = file.replace('.json', '')
    const val = await batch.get('/metadata/' + file)
    savedMetadata[key] = JSON.parse(val.toString())
  }
  await batch.flush()

  t.is(JSON.stringify(savedMetadata), JSON.stringify(metadata))

  await feeds.close()

  // Modify metadata
  {
    const metadata = {
      profile: { foo: 'zar' },
      schema: { foo: 42 }
    }

    const feeds = new Feeds(storage, { metadata })

    const drive = await feeds._drive(key)

    await feeds.feed(key, { announce: false })

    const savedMetadata = {}
    const batch = drive.batch()
    for await (const file of drive.readdir('/metadata')) {
      const key = file.replace('.json', '')
      const val = await batch.get('/metadata/' + file)
      savedMetadata[key] = JSON.parse(val.toString())
    }
    await batch.flush()

    t.is(JSON.stringify(savedMetadata), JSON.stringify(metadata))

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
