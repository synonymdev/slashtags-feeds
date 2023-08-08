export = Feed;
declare class Feed {
    /**
     * Encode a value into a buffer assuming it is a utf8 string or JSON
     *
     * @param {string | object} value
     */
    static _encode(value: string | object): any;
    /**
     * Decode a value from a buffer assuming it is a utf8 string or JSON
     *
     * @param {Uint8Array} value
     */
    static _decode(value: Uint8Array): any;
    /**
     * @param {WebRelayClient} client
     * @param {Config} config
     * @param {object} [opts]
     * @param {Uint8Array} [opts.icon]
     */
    constructor(client: WebRelayClient, config: Config, opts?: {
        icon?: Uint8Array;
    });
    _client: import("@synonymdev/web-relay/types/lib/client/index");
    _dir: string;
    _opened: Promise<[void, void]>;
    /**
     * @param {string} path - path to the file in this feed
     */
    createURL(path?: string): Promise<string>;
    ready(): Promise<[void, void]>;
    /**
     * @param {string} path
     */
    _normalizePath(path: string): string;
    /**
     * Ensures that a config file `/slashfee.json` exists or creates it if not.
     *
     * @param {Config} [config]
     * @param {Uint8Array} [icon]
     */
    _saveConfig(config?: Config, icon?: Uint8Array): Promise<[void, void]>;
    /**
     * Creates or updates an entry in the feed directory
     *
     * @param {string} path
     * @param {Uint8Array | string} value - Uint8Array or a utf8 string
     */
    put(path: string, value: Uint8Array | string): Promise<void>;
    /**
     * Read local data
     *
     * @param {string} path
     * @returns {Promise<Uint8Array | null>}
     */
    get(path: string): Promise<Uint8Array | null>;
    /**
    * Deletes an entry in the feed directory
    *
    * @param {string} path
    * @returns {Promise<void>}
    */
    del(path: string): Promise<void>;
    close(): Promise<void>;
}
declare namespace Feed {
    export { WebRelayClient, Config };
}
type Config = {
    [key: string]: any;
    name: string;
    description?: string;
    icons?: {
        [size: string]: string;
    };
    type?: string;
    version?: string;
    fields?: {
        [key: string]: any;
        name: string;
        description?: "Bitcoin / US Dollar price history";
        main: "/feed/BTCUSD-last";
        files?: {
            [name: string]: string;
        };
    }[];
};
type WebRelayClient = import('@synonymdev/web-relay/types/lib/client/index');
//# sourceMappingURL=index.d.ts.map