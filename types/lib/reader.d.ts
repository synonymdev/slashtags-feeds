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
    /**
     * @returns {Promise<Config | null>}
     */
    getConfig(): Promise<Config | null>;
    /**
     * Returns a value from the feed.
     *
     * @template T
     *
     * @param {string} key
     * @param {(buf: Uint8Array) => T} [decode]
     *
     * @returns {Promise<T | null>}
     */
    getField<T>(key: string, decode?: (buf: Uint8Array) => T): Promise<T>;
}
declare namespace Reader {
    export { WebRelayClient, Config };
}
type Config = import('./writer').Config;
type WebRelayClient = import('@synonymdev/web-relay/types/lib/client/index');
//# sourceMappingURL=reader.d.ts.map