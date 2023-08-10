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
    _config: any;
    _createURL(path: any): string;
    get config(): any;
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
type WebRelayClient = import('@synonymdev/web-relay/types/lib/client/index');
//# sourceMappingURL=reader.d.ts.map