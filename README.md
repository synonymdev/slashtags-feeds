# Slashtags Feeds

A library for creating and managing feeds using Hyperdrive and Hyperswarm.

## Usage

Initiate the library.

```js
const feeds = new Feeds();
const feedID = feeds.randomID();
await feeds.update(feedID, 'balance', 1000);
```

## API

#### `const feeds = new Feeds(storage)`

Create a Feeds instance.

`storage` Storage directory to save feeds at. Defaults to `os.homedir() + '/.slashtags-feeds/'`

#### `feeds.randomID()`

Generate a random string id to be used as the feedID.

#### `await feeds.feed(feedID)`

Returns the feed `key` and `encryptionKey` for a given feed, identified by any serializable id.
It awaits until the feed is announced on the swarm.

#### `await feeds.update(feedID, key, value)`

Updates a feed. `key` is a string, and `value` is a serializable JSON object.

#### `await feeds.get(feedID, key)`

Returns a value from a feed.

#### `await feeds.close()`

Gracefully closing feeds and freeing IO resources.

#### `await feeds.destroy(feedID)`

Destroys all stored data for the feed.
