# Slashtags Feeds

A library for creating and managing feeds using Hyperdrive and Hyperswarm.

## Installation

```sh
npm install @synonymdev/feeds
```

## Usage

### Example
```js
import Feeds from '@synonymdev/feeds'

const feeds = new Feeds();
const feedID = feeds.randomID();
await feeds.update(feedID, 'balance', 1000);

let get = await feeds.get(feedID, 'foo')
console.log(get)

feeds.close()
```

### API

#### `const feeds = new Feeds(storage, [opts])`

Create a Feeds instance.

`storage` Storage directory to save feeds at. Defaults to `os.homedir() + '/.slashtags-feeds/'`

`opts` includes:

- `metadata`: an object of metadata files to be saved along the data. example `{ schema: schema }`

#### `feeds.randomID()`

Generate a random string id good for using as the feedID.

#### `await feeds.feed(feedID)`

Returns the feed `key` and `encryptionKey` for a given feed, identified by any serializable id.
It awaits until the feed is announced on the swarm.

#### `await feeds.update(feedID, key, value)`

Updates a feed. `key` is a string, and `value` is Uint8Array or a utf-8 string.

#### `await feeds.get(feedID, key)`

Returns a Uint8Array value from a feed.

#### `await feeds.close()`

Gracefully closing feeds and freeing IO resources.

#### `await feeds.destroy(feedID)`

Destroys all stored data for the feed.

### How it works

As of this first version, Slashtags feeds is a directory on top of Hyperdrive with the current structure:

```
├── feed
│   ├── foo
│   ├── bar
└── slashfeed.json
```

Where `slashfeed.json` defines the `name`, `image` and other future metadata about the feed.
And `feed` directory contains the feed files, where each file represents a key value pair.
