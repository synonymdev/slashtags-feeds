# Slashtags Feeds

A library for managing feeds using Slashtags SDK.

## Usage

Initiate the library.

```js
const feeds = await Feeds.init();

const feedID = FEED.randomID();
const amount = {
  USD: 1000,
};

await feeds.update(feedID, 'balance', balance);
```

## API

#### `await Feeds.init([opts])`

Create a Feeds instance.

`opts` includes:

- `key` A secret key of type Buffer or Uint8Array. If not passed a random key will be generated and feeds will not be persistent.

- `storage` Storage directory for feeds. Defaults to `os.homedir() + '/.slashtags-feeds/'`

#### `feeds.randomID()`

Generate a random string id to be used as the feedID.

#### `await feeds.feed(feedID)`

Returns the feed `key` and `encryptionKey` for a given feed, identified by any serializable id.

#### `await feeds.update(feedID, key, value)`

Updates a feed. `key` is a string, and `value` is a serializable JSON object.

#### `await feeds.close()`

Gracefully closing feeds and freeing IO resources.

#### `await feeds.destroy(feedID)`

Destroys all stored data for the feed.
