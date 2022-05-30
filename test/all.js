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
