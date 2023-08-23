export = Reader;
declare class Reader {
    /**
     * @param {WebRelayClient} client
     * @param {string} url - slashfeed:<userID>/<feedName>?relay=<relayAddress>
     */
    constructor(client: WebRelayClient, url: string);
    _client: import("@synonymdev/web-relay/types/lib/client/index");
    _parsed: {
        protocol: string;
        key: Uint8Array;
        id: string;
        path: string;
        query: {
            [k: string]: string | boolean;
        };
        fragment: string;
        privateQuery: {
            [k: string]: string | boolean;
        };
    };
    /** @type {Config |null} */
    _config: Config | null;
    /** @type {Uint8Array |null} */
    _icon: Uint8Array | null;
    /**
     * Await the resolution of slashfeed.json configuration and other metadata.
     */
    ready(): Promise<void>;
    /**
     * @param {string} path
     */
    _createURL(path: string): string;
    get config(): Feed.Config;
    get icon(): Uint8Array;
    /**
     * Returns the icon data of the feed if it exists.
     *
     * @param {string} [size]
     */
    getIcon(size?: string): Promise<Uint8Array>;
    /**
     * @returns {Promise<Config | null>}
     */
    getConfig(): Promise<Config | null>;
    /**
     * Returns a value from the feed.
     *
     * @template T
     *
     * @param {string} name
     * @param {(buf: Uint8Array) => T} [decode]
     *
     * @returns {Promise<T | null>}
     */
    getField<T>(name: string, decode?: (buf: Uint8Array) => T): Promise<T>;
    /**
     * Subscribe to a field
     *
     * @template T
     *
     * @param {string} name
     * @param {(value: any) => any} [onupdate]
     * @param {(buf: Uint8Array) => T} [decode]
     *
     * @returns {() => void} unsubscribe function
     */
    subscribe<T_1>(name: string, onupdate?: (value: any) => any, decode?: (buf: Uint8Array) => T_1): () => void;
    /**
     * @param {string} name
     * @returns {string}
     */
    _fieldUrl(name: string): string;
}
declare namespace Reader {
    export { WebRelayClient, Config };
}
type Config = import('./writer').Config;
import Feed = require("./writer.js");
type WebRelayClient = import('@synonymdev/web-relay/types/lib/client/index');
//# sourceMappingURL=reader.d.ts.map