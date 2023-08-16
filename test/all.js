const test = require('brittle')
const os = require('os')
const path = require('path')
const b4a = require('b4a')
const { Client, Relay } = require('@synonymdev/web-relay')

const { Feed, Reader } = require('../index.js')

test('Writer - save slashfeed.json config on initialization', async (t) => {
  const icon = b4a.from('icon data')
  const config = { name: 'price-feed', icons: { 48: 'icon.png' } }

  const writerClient = new Client({ storage: tmpdir() })

  {
    const writer = new Feed(writerClient, config, { icon })

    await writer.ready()

    const savedConfig = await writerClient.get('/price-feed/slashfeed.json')
    t.alike(Feed.decode(savedConfig), config)

    const savedIcon = await writerClient.get('/price-feed/icon.png')
    t.alike(savedIcon, icon)
  }

  // verify that not passing an icon doesn't throw an error.
  {
    const writer = new Feed(writerClient, config, { icon })

    await writer.ready()

    const savedConfig = await writerClient.get('/price-feed/slashfeed.json')
    t.alike(Feed.decode(savedConfig), config)

    const savedIcon = await writerClient.get('/price-feed/icon.png')
    t.alike(savedIcon, icon)
  }
})

test('Writer - local put & get', async (t) => {
  const writerClient = new Client({ storage: tmpdir() })
  const writer = new Feed(writerClient, { name: 'foo' })

  await writer.put('foo', 'bar')

  t.alike(Feed.decode(await writer.get('foo')), 'bar')
})

test('Reader - fetch from relay', async (t) => {
  const relay = new Relay(tmpdir())
  const address = await relay.listen()

  // Handle spaes in feed names
  const icon = b4a.from('icon data')
  const config = { name: 'price feed 😇', icons: { 48: 'icon.png' } }

  const writerClient = new Client({ storage: tmpdir(), relay: address })
  const feed = new Feed(writerClient, config, { icon })

  await feed.put('foo', 'bar')

  const readerClient = new Client({ storage: tmpdir() })
  const reader = new Reader(readerClient, feed.url)

  await sleep(100)

  t.alike(await reader.getConfig(), config)
  t.alike(await reader.getIcon(), icon)
  t.alike(reader.config, config)
  t.alike(await reader.getField('foo'), 'bar')

  relay.close()
})

test('Reader - subscribe', async (t) => {
  const relay = new Relay(tmpdir())
  const address = await relay.listen()

  const config = { name: 'price-feed' }

  const writerClient = new Client({ storage: tmpdir(), relay: address })
  const feed = new Feed(writerClient, config)

  const readerClient = new Client({ storage: tmpdir() })
  const reader = new Reader(readerClient, feed.url)

  const ts = t.test('subscribe')
  ts.plan(1)

  const unsubscribe = reader.subscribe('foo', (value) => {
    ts.alike(value, 'bar')
  })

  await feed.put('foo', 'bar')

  await ts

  relay.close()
  unsubscribe()
})

test('encode - decode', async (t) => {
  const values = [
    // raw
    new Uint8Array([232, 242, 253]),
    'hello world',
    '42',
    42,
    ['hello world', 42, { foo: 'bar' }],
    { foo: 'bar', array: [1, 2, '3', null] },
    null
  ]

  for (const value of values) {
    const encoded = Feed.encode(value)
    const decoded = Feed.decode(encoded)
    t.alike(decoded, value)
  }
})

function tmpdir () {
  return path.join(os.tmpdir(), Math.random().toString(16).slice(2))
}

/**
   * @param {number} ms
   */
function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
