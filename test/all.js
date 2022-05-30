const Feeds = require('../index.js')
const test = require('brittle')

test('Basic', async (t) => {
  t.plan(6)

  console.time('init')
  const feeds = await Feeds.init({
    key: Buffer.from('f'.repeat(64), 'hex'),
    storage: './storage/',
    persist: false
  })
  console.timeEnd('init')

  console.time('create')
  const feed = await feeds.feed(234)
  console.timeEnd('create')

  t.ok(feed.key.length === 32)
  t.ok(feed.encryptionKey.length === 32)

  console.time('update')
  await feeds.update(234, 'foo', 'bar')
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

  await feeds.update(234, 'foo', { hello: 'world' })

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

test('deterministic keys', async (t) => {
  const feeds = await Feeds.init({
    key: Buffer.from('a'.repeat(64), 'hex'),
    persist: false
  })

  const feed = await feeds.feed(123)
  t.is(
    feed.key.toString('hex'),
    '9f6754be8b6802a5e0459b9ef0639e7a4d4af934918e945554266294c17db3dd'
  )
  t.is(
    feed.encryptionKey.toString('hex'),
    '6070f6024af702a5c3ff2764c37a17d273074b62626eb933016b937e95258aee'
  )

  feeds.close()
})

test('primaryKey from storage', async (t) => {
  const feeds = await Feeds.init({
    storage: './test/storage'
  })

  t.is(
    feeds.sdk.primaryKey.toString('hex'),
    'ca7b9fa3969f4d94ba0df6a9097583834d194a6caad2e436ff1e1ecf3729782a'
  )

  const feed = await feeds.feed(123)
  t.is(
    feed.key.toString('hex'),
    '08467493cbbc3b3506a8906ddcbf64aeea3f600e5de39ed364bd558a50c35f6f'
  )
  t.is(
    feed.encryptionKey.toString('hex'),
    'eb214308140bae8fa12d593ebdc83d37b619c4d17ed2d9bae93fae89a44ffab4'
  )

  feeds.close()
})
