// Minimal ambient types so Node's tsc can check the Deno Edge Functions
// (`npm run typecheck:functions`). Only what the functions use is declared;
// widen a declaration when a function starts using more of that API.
// ponytail: hand-written stubs, swap for real types (deno check / @types) if they drift.

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): unknown;
};

// Side-effect import that only adds Supabase's runtime globals in Deno.
declare module "jsr:@supabase/functions-js/edge-runtime.d.ts" {}

declare module "https://esm.sh/kysely@0.27.2" {
  export type Generated<T> = T;
  export type Selectable<T> = T;

  export interface QueryResult<O> {
    rows: O[];
    numAffectedRows?: bigint;
  }

  export class CompiledQuery {
    readonly sql: string;
    readonly parameters: readonly unknown[];
    static raw(sql: string, parameters?: unknown[]): CompiledQuery;
  }

  export interface DatabaseConnection {
    executeQuery<O>(compiledQuery: CompiledQuery): Promise<QueryResult<O>>;
    streamQuery<O>(
      compiledQuery: CompiledQuery,
      chunkSize?: number,
    ): AsyncIterableIterator<QueryResult<O>>;
  }

  export interface Driver {
    init(): Promise<void>;
    acquireConnection(): Promise<DatabaseConnection>;
    beginTransaction(connection: DatabaseConnection): Promise<void>;
    commitTransaction(connection: DatabaseConnection): Promise<void>;
    rollbackTransaction(connection: DatabaseConnection): Promise<void>;
    releaseConnection(connection: DatabaseConnection): Promise<void>;
    destroy(): Promise<void>;
  }

  // The query builder is left untyped: typing it by hand would mean copying kysely.
  export class Kysely<_DB> {
    constructor(config: { dialect: unknown });
    transaction(): {
      execute<T>(callback: (trx: any) => Promise<T>): Promise<T>;
    };
  }

  export class PostgresAdapter {}
  export class PostgresIntrospector {
    constructor(db: Kysely<any>);
  }
  export class PostgresQueryCompiler {}

  export interface RawBuilder<O> {
    execute(db: Kysely<any>): Promise<QueryResult<O>>;
  }
  export function sql<O = unknown>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): RawBuilder<O>;
}

declare module "https://deno.land/x/postgres@v0.17.0/mod.ts" {
  export interface PoolClient {
    queryObject<T>(query: { text: string; args?: unknown[] }): Promise<{
      command: string;
      rowCount?: number;
      rows: T[];
    }>;
    release(): void;
  }

  export class Pool {
    constructor(connection: string, size: number, lazy?: boolean);
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
  }
}

declare module "npm:@sentry/deno" {
  export function init(options: Record<string, unknown>): void;
  export function captureException(error: unknown): string;
  export function flush(timeout?: number): Promise<boolean>;
}
