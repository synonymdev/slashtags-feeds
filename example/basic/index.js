const Relay = require('@synonymdev/web-relay')
const Client = require('@synonymdev/web-relay/client')
const path = require('path')

const Feed = require('@synonymdev/feeds')
const Reader = require('@synonymdev/feeds/reader')

const relay = new Relay(path.join(__dirname, '/storage/relay'));

(async () => {
  const relayAddress = await relay.listen()

  const client = new Client({ storage: path.join(__dirname, '/storage/writer'), relay: relayAddress })

  const icon = Buffer.from('icon-data')

  const config = {
    name: 'price-feed',
    description: 'a price feed',
    icons: {
      32: 'icon.png'
    },
    type: 'price-feed',
    version: '1.0.0',
    fields: [
      {
        name: 'latest',
        description: 'Bitcoin / US Dollar price history',
        main: '/feed/BTCUSD-last'
      }
    ]
  }

  const feed = new Feed(client, config, { icon })
  // Wait for config file to be saved
  await feed.ready()

  // may need to wait more for a the relay to get the files from the client in production.
  // await new Promise(resolve => settimeout(resolve, 200))

  feed.put('BTCUSD-last', 1000000)

  {
    const client = new Client({ storage: path.join(__dirname, '/storage/reader') })
    const reader = new Reader(client, feed.url)

    console.log('Config:', await reader.getConfig())
    console.log('BTCUSD-last', await reader.getField('BTCUSD-last'))
  }

  relay.close()
})()
