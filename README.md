# Slashtags Feeds

A library for managing users' feeds using Slashtags SDK.

## Usage

Initiate the library.

```js
const feeds = await Feeds.init();

const userID = 1234;
const amount = {
  USD: 1000,
};

await feeds.update(userID, 'balance', balance);
```

## API

#### `await Feeds.init([opts])`

Create a Feeds instance.

`opts` includes:

- `key` A secret key of type Buffer or Uint8Array. If not passed a random key will be generated and feeds will not be persistent.

- `storage` Storage directory for feeds. Defaults to `os.homedir() + '/.slashtags-feeds/'`

#### `await feeds.feed(userID)`

Returns the feed `key` and `encryptionKey` for a given user, identified by any serializable id.

#### `await feeds.update(userID, key, value)`

Update a user's feed. `key` is a string, and `value` is a serializable JSON object.

#### `await feeds.close()`

Gracefully closing feeds and freeing IO resources.
