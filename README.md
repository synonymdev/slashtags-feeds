# Slashtags Feeds

A library for creating and managing feeds using Hyperdrive and Hyperswarm.

## Usage

```js
const { Client, Relay } = require('@synonymdev/web-relay')
const path = require('path')

const { Feed, Reader } = require('@synonymdev/feeds')

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

  confsole.log(feed.config.fields.map(f => f.main)) //  ["/feed/BTCUSD-last"]

  // may need to wait more for a the relay to get the files from the client in production.
  // await new Promise(resolve => settimeout(resolve, 200))

  // Update a field, by its name in the config above.
  feed.put('latest', 1000000)

  {
    const client = new Client({ storage: path.join(__dirname, '/storage/reader') })
    const reader = new Reader(client, feed.url)

    console.log('Config:', await reader.getConfig())
    console.log('BTCUSD-last', await reader.getField('latest'))
  }

  relay.close()
})()
```

## API

#### `const feed = new Feed(client, config, [opts])`

Create a Feed instance.

`client` is a [web-relay](https://github.com/slashtags/web-relay) client

`config` is a feed config file to be saved at `./slashfeed.json`

`opts` includes:

- `icon`: an optional icon data as Uint8Array

### `const url = feed.url`

The feed's url in the format `slashfeed:<client.id>/<feed-name>/[?query]`

### `await feed.ready()`

Await to fetch and populate `feed.config` and `feed.icon`.

#### `await feeds.put(key, value)`

Updates a feed. `key` is a string, and `value` is Uint8Array, a utf-8 string or a JSON.

#### `await feeds.get(key)`

Returns a Uint8Array value from a the local feed.

#### `await feeds.close()`

Gracefully closing feeds and the underlying client.

#### `const buffer = Feed.encode(value)`

Encodes a value (string, number, null, boolean, array, or object) as JSON and return a Uint8Array

#### `const value = Feed.dcode(buffer)`

Decodes a Uint8Array as JSON if possible, or return the Uint8Array itself.

#### `const reader = new Reader(client, url)`

Create an instance of the helper `Reader` class.

`client` is a [web-relay](https://github.com/slashtags/web-relay) client

`url` is a feed url `feed.url`

#### `const config = await reader.getConfig()`

Returns the `slashfeed.json` configuration file, and sets the `reader.config` value. Internally this method gets called as soon as you initialize the Reader instance.

#### `const iconData = await reader.getIcon([size])`

Returns the data buffer of the feed icon if it exists. `size` is an optional input to choose icon size to fetch, by default it will return the first size in the `config.icons`.

#### `const value = await reader.getField(fieldName, [decode])`

Returns the value of a specific field.

`decode` is an opitonal funciton that expects a `Uint8Array` and returns the decoded value.

#### `await reader.subscribe(fieldName, onupdate, [decode])`

Returns the value of a specific field.

`onupdate(value: T) => any` is a callback function that gets the decoded value as an argument.
`decode(buf:Uint8Array) => T` is an opitonal funciton that expects a `Uint8Array` and returns the decoded value.

## How it works

As of this first version, Slashtags feeds is a directory with the current structure:

```
├── feed
│   ├── foo
│   ├── bar
└── slashfeed.json
```

Where `slashfeed.json` defines the `name`, `image` and other future metadata about the feed.
And `feed` directory contains the feed files, where each file represents a key value pair.
