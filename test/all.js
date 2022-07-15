const Feeds = require('../index.js')
const test = require('brittle')
const fs = require('fs')
const path = require('path')

const storage = path.join(__dirname, 'storage')

test('Basic', async (t) => {
  t.plan(6)

  console.time('init')
  const feeds = await Feeds.init({
    key: Buffer.from('f'.repeat(64), 'hex'),
    storage,
    persist: false
  })
  console.timeEnd('init')

  console.time('create')
  const feed = await feeds.feed('234')
  console.timeEnd('create')

  t.ok(feed.key.length === 32)
  t.ok(feed.encryptionKey.length === 32)

  console.time('update')
  await feeds.update('234', 'foo', 'bar')
  console.timeEnd('update')

  // Read feed
  const { SDK } = await import('@synonymdev/slashtags-sdk')
  const sdk = await SDK.init({ persist: false })
  const slashtag = sdk._root

  console.time('read feed')
  const drive = await slashtag.drive(feed)
  await drive.update()
  console.timeEnd('read feed')

  t.ok(drive.readable)
  t.is((await drive.get('foo')).toString(), '"bar"')

  await feeds.update('234', 'foo', { hello: 'world' })

  const promise = new Promise((resolve) => {
    drive.on('update', async ({ key }) => {
      t.is(key, 'foo')

      t.is(
        (await drive.get('foo')).toString(),
        JSON.stringify({ hello: 'world' })
      )

      resolve()
    })
  })

  await promise

  await feeds.close()
  await sdk.close()
})

test('generate new random key', async (t) => {
  const feeds = new Feeds()
  const key = feeds.randomID()

  t.is(typeof key === 'string', true)
  t.is(key.length === 64, true)
  t.is(key !== feeds.randomID(), true)
})

test('deterministic keys', async (t) => {
  const feeds = await Feeds.init({
    key: Buffer.from('a'.repeat(64), 'hex'),
    persist: false
  })

  const feed = await feeds.feed('123')
  t.is(
    feed.key.toString('hex'),
    '5088ab7aac2a095c5b23f56e9cbc307ac2d448a5182faaec85798544c1e06a63'
  )
  t.is(
    feed.encryptionKey.toString('hex'),
    '4dc220d6dacfeee83bd5531a4e857178bbe8fdd5416218bc03458598771c36a7'
  )

  feeds.close()
})

test('primaryKey from storage', async (t) => {
  const feeds = await Feeds.init({
    storage
  })

  t.is(
    feeds.sdk.primaryKey.toString('hex'),
    'ca7b9fa3969f4d94ba0df6a9097583834d194a6caad2e436ff1e1ecf3729782a'
  )

  const feed = await feeds.feed('123')
  t.is(
    feed.key.toString('hex'),
    '5febfab520c46022138ff0390ee2b34261cd40de438bb173c858f2203a4a6c1a'
  )
  t.is(
    feed.encryptionKey.toString('hex'),
    '0e2146f1212346e49528799449434f248c1b7663758c5b6fcfd20e7212d8757c'
  )

  feeds.close()
})

test('should be able to delete a drive from storage', async (t) => {
  const feeds = await Feeds.init({
    key: Buffer.from('f'.repeat(64), 'hex'),
    storage
  })
  const key = feeds.randomID()

  const drive = await feeds._drive(key)

  await feeds.update(key, 'foo', 'bar')
  await feeds.update(key, 'foo2', 'bar2')

  t.is(storageExists(drive), true)

  await feeds.destroy(key)

  t.is(storageExists(drive), false)

  await feeds.close()
})

function storageExists (drive) {
  const cores = [drive.feed, drive.content.core]
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
