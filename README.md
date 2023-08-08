# Slashtags Feeds

A library for creating and managing feeds using Hyperdrive and Hyperswarm.

## Usage

Initiate the library.

```js
const Client = require('@synonymdev/web-relay/client')
const fs = require('fs')

const icon = fs.readFileSync('./icon.png')

const client = new Client({ storage: '/path/to/storage', relay: 'https://example.com' })

const config = {
  name: 'price-feed'
  description: 'a price feed',
  icons: {
      "32": "icon.png"
  },
  type: 'price-feed',
  version: '1.0.0',
  fields:[
    {
      name: "latest",
      description?: 'Bitcoin / US Dollar price history',
      main: '/feed/BTCUSD-last',
    }
  ] 
}

const feed = new Feed(client, config, { icon });

feed.ready().then(() =>{
 // Wait for config file to be saved
})

feed.put('/feed/BTCUSD-last', 1000000)
```

## API

#### `const feed = new Feed(client, config, [opts])`

Create a Feed instance.

`client` is a [web-relay](https://github.com/slashtags/web-relay) client

`config` is a feed config file to be saved at `./slashfeed.json`

`opts` includes:

- `icon`: an optional icon data as Uint8Array

### `const url = await feed.createURL([path])`

Creates a `slashfeed:` url. If `path` is not set to a specific file, it returns the url to the feed directory

#### `await feeds.put(key, value)`

Updates a feed. `key` is a string, and `value` is Uint8Array, a utf-8 string or a JSON.

#### `await feeds.get(key)`

Returns a Uint8Array value from a the local feed.

#### `await feeds.close()`

Gracefully closing feeds and the underlying client.
