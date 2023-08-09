const test = require('brittle')
const os = require('os')
const b4a = require('b4a')
/** @type {typeof import('@synonymdev/web-relay/types/lib/client/index')} */
// @ts-ignore
const Client = require('@synonymdev/web-relay/client')
const Relay = require('@synonymdev/web-relay')

const Feed = require('../index.js')
const Reader = require('../lib/reader.js')

test('save slashfeed.json config on initialization', async (t) => {
  const icon = b4a.from('icon data')
  const config = { name: 'price-feed', icons: { 48: 'icon.png' } }

  const writerClient = new Client({ storage: tmpdir() })

  {
    const writer = new Feed(writerClient, config, { icon })

    await writer.ready()

    const savedConfig = await writerClient.get('/price-feed/slashfeed.json')
    t.alike(Feed._decode(savedConfig), config)

    const savedIcon = await writerClient.get('/price-feed/icon.png')
    t.alike(savedIcon, icon)
  }

  // verify that not passing an icon doesn't throw an error.
  {
    const writer = new Feed(writerClient, config, { icon })

    await writer.ready()

    const savedConfig = await writerClient.get('/price-feed/slashfeed.json')
    t.alike(Feed._decode(savedConfig), config)

    const savedIcon = await writerClient.get('/price-feed/icon.png')
    t.alike(savedIcon, icon)
  }
})

test('local - put & get', async (t) => {
  const writerClient = new Client({ storage: tmpdir() })
  const writer = new Feed(writerClient, { name: 'foo' })

  await writer.put('foo', 'bar')

  t.alike(await writer.get('foo'), b4a.from('bar'))
})

test('fetch from relay', async (t) => {
  const relay = new Relay(tmpdir())
  const address = await relay.listen()

  const config = { name: 'price-feed' }

  const writerClient = new Client({ storage: tmpdir(), relay: address })
  const feed = new Feed(writerClient, config)

  await feed.put('foo', 'bar')

  const readerClient = new Client({ storage: tmpdir() })
  const reader = new Reader(readerClient, feed.url)

  await sleep(100)

  t.alike(await reader.getConfig(), config)
  t.alike(await reader.getField('foo'), 'bar')

  relay.close()
})

function tmpdir () {
  return os.tmpdir() + Math.random().toString(16).slice(2)
}

/**
 * @param {number} ms
 */
function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
