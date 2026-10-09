declare module 'node:sqlite' {
  export interface RunResult {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }

  export interface StatementSync {
    run(...params: unknown[]): RunResult;
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Array<Record<string, unknown>>;
  }

  export class DatabaseSync {
    constructor(
      location: string,
      options?: {
        open?: boolean;
        readOnly?: boolean;
        enableForeignKeyConstraints?: boolean;
      }
    );
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }
}
