export = Feed;
declare class Feed {
    /**
     * Encode a serializable into a Uint8Array
     *
     * @param {string | number | null | boolean | Array | Object | Uint8Array} value
     * @returns {Uint8Array}
     */
    static encode(value: string | number | null | boolean | any[] | any | Uint8Array): Uint8Array;
    /**
     * Decode a value from a buffer assuming it is a utf8 string or JSON
     *
     * @param {Uint8Array | string} value
     */
    static decode(value: Uint8Array | string): any;
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
    _config: Config;
    _opened: Promise<[void, void]>;
    _url: string;
    get url(): string;
    ready(): Promise<[void, void]>;
    /**
     * @param {string} path
     */
    _normalizePath(path: string): string;
    /**
     * @param {string} name
     */
    _normalizeField(name: string): string;
    /**
     * Ensures that a config file `/slashfee.json` exists or creates it if not.
     *
     * @param {Config} [config]
     * @param {Uint8Array} [icon]
     */
    _saveConfig(config?: Config, icon?: Uint8Array): Promise<[void, void]>;
    /**
     * Creates or updates a field in the feed
     *
     * @param {string} name
     * @param {string | number | null | boolean | Array | Object | Uint8Array} value - Uint8Array or a utf8 string
     */
    put(name: string, value: string | number | null | boolean | any[] | any | Uint8Array): Promise<void>;
    /**
     * Read local field
     *
     * @param {string} name
     * @returns {Promise<Uint8Array | null>}
     */
    get(name: string): Promise<Uint8Array | null>;
    /**
    * Deletes a field in the feed directory
    *
    * @param {string} name
    * @returns {Promise<void>}
    */
    del(name: string): Promise<void>;
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
        description?: string;
        main: string;
        files?: {
            [name: string]: string;
        };
    }[];
};
type WebRelayClient = import('@synonymdev/web-relay/types/lib/client/index');
//# sourceMappingURL=writer.d.ts.map