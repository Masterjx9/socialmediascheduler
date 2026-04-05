import { Platform } from 'react-native';
import * as SQLiteNative from 'react-native-sqlite-storage';
import type { DatabaseParams } from 'react-native-sqlite-storage';
import RNFS from './RNFS';

let AsyncStorage: any = null;
try {
  AsyncStorage =
    require('@react-native-async-storage/async-storage').default ??
    require('@react-native-async-storage/async-storage');
} catch (_error) {
  AsyncStorage = null;
}

let NativeModulesRef: any = null;
try {
  NativeModulesRef = require('react-native').NativeModules ?? null;
} catch (_error) {
  NativeModulesRef = null;
}

export type ResultSet = {
  insertId: number | undefined;
  rowsAffected: number;
  rows: {
    length: number;
    item(index: number): any;
    raw(): any[];
  };
};

export type ExecuteSqlSuccess = (tx: Transaction, results: ResultSet) => void;
export type ExecuteSqlError =
  | ((error: any) => void)
  | ((tx: Transaction, error: any) => void);

export type ExecuteSql = (
  sqlStatement: string,
  args?: any[],
  callback?: ExecuteSqlSuccess,
  errorCallback?: ExecuteSqlError,
) => void;

export type Transaction = {
  executeSql: ExecuteSql;
};

export type SQLiteDatabase = {
  dbname?: string;
  transaction: (
    fn: (tx: Transaction) => void,
    error?: (err: any) => void,
    success?: () => void,
  ) => void;
  readTransaction: (
    fn: (tx: Transaction) => void,
    error?: (err: any) => void,
    success?: () => void,
  ) => void;
  close: (success?: () => void, error?: (err: any) => void) => void;
  executeSql: ExecuteSql;
  attach?: (
    nameToAttach: string,
    alias: string,
    success?: () => void,
    error?: (err: any) => void,
  ) => void;
  detach?: (
    alias: string,
    success?: () => void,
    error?: (err: any) => void,
  ) => void;
};

type MockRows = {
  length: number;
  item: (index: number) => any;
  raw: () => any[];
};

type ContentRow = {
  content_id: number;
  content_type: string;
  content_data: string;
  post_date: number;
  description: string | null;
  user_providers: string | null;
  tags: string | null;
  title: string | null;
  privacy: string | null;
  category: string | null;
  selfDeclaredMadeForKids: boolean;
  thumbnail: string | null;
  published: string;
};

type Store = {
  user_providers: Array<{ provider_name: string; provider_user_id: string }>;
  content: ContentRow[];
  instagram_accounts: any[];
  youtube_accounts: any[];
  threads_accounts: any[];
  linkedin_accounts: any[];
  tiktok_accounts: any[];
  twitter_accounts: any[];
  bluesky_accounts: any[];
  app_settings: Array<{ setting_key: string; setting_value: string }>;
};

type Persisted = {
  store: Store;
  insertSeq: number;
  contentSeq: number;
};

const isWindows = Platform.OS === 'windows';
const TABLES = [
  'user_providers',
  'content',
  'instagram_accounts',
  'youtube_accounts',
  'threads_accounts',
  'linkedin_accounts',
  'tiktok_accounts',
  'twitter_accounts',
  'bluesky_accounts',
  'app_settings',
];

const emptyStore = (): Store => ({
  user_providers: [],
  content: [],
  instagram_accounts: [],
  youtube_accounts: [],
  threads_accounts: [],
  linkedin_accounts: [],
  tiktok_accounts: [],
  twitter_accounts: [],
  bluesky_accounts: [],
  app_settings: [],
});

const defaultSettings = [
  { setting_key: 'default_schedule_option', setting_value: 'Next available day' },
  { setting_key: 'default_schedule_time', setting_value: '09:00' },
];

let store = emptyStore();
let insertSeq = 1;
let contentSeq = 1;
let loaded = false;
let loadPromise: Promise<void> | null = null;
let writeQueue: Promise<void> = Promise.resolve();
let warned = false;
let persistencePathLogged = false;
let asyncStorageLogged = false;
let legacyStorageLogged = false;
const ASYNC_PERSIST_KEY = 'socialmediascheduler.sqliteFallbackStore.v1';

const resolveLegacyStorageModule = (): any => {
  const modules = NativeModulesRef ?? {};
  const candidates = [
    modules.RNCAsyncStorage,
    modules.ReactNativeAsyncStorage,
    modules.AsyncSQLiteDBStorage,
    modules.AsyncLocalStorage,
  ];
  return candidates.find(
    (mod) =>
      mod &&
      typeof mod.multiGet === 'function' &&
      typeof mod.multiSet === 'function',
  );
};

const getLegacyStorageModule = (): any => {
  const mod = resolveLegacyStorageModule();
  if (
    mod &&
    typeof mod.multiGet === 'function' &&
    typeof mod.multiSet === 'function'
  ) {
    return mod;
  }
  return null;
};

const hasLegacyStorage = (): boolean => Boolean(getLegacyStorageModule());

if (isWindows) {
  const moduleKeys = NativeModulesRef ? Object.keys(NativeModulesRef) : [];
  console.log(
    `[SQLite] Legacy storage module present=${hasLegacyStorage()} nativeModuleCount=${moduleKeys.length}`,
  );
}

const firstStorageError = (errors: any): any => {
  if (!errors) {
    return null;
  }
  if (Array.isArray(errors) && errors.length > 0) {
    return errors.find((e) => e?.message) ?? errors[0];
  }
  if (errors?.message) {
    return errors;
  }
  return null;
};

const legacyGetItem = async (key: string): Promise<string | null> =>
  new Promise((resolve, reject) => {
    const mod = getLegacyStorageModule();
    if (!mod) {
      resolve(null);
      return;
    }

    mod.multiGet([key], (errors: any, result: any) => {
      const err = firstStorageError(errors);
      if (err) {
        reject(err);
        return;
      }
      const value = Array.isArray(result) ? result[0]?.[1] : null;
      resolve(value ?? null);
    });
  });

const legacySetItem = async (key: string, value: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const mod = getLegacyStorageModule();
    if (!mod) {
      resolve();
      return;
    }

    mod.multiSet([[key, value]], (errors: any) => {
      const err = firstStorageError(errors);
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });

const toRows = (items: any[]): MockRows => ({
  length: items.length,
  item: (index: number) => items[index],
  raw: () => items,
});

const makeResultSet = (
  items: any[] = [],
  rowsAffected = 0,
  insertId: number | undefined = undefined,
): ResultSet => ({
  rows: toRows(items),
  rowsAffected,
  insertId,
});

const normalizeSql = (sql: string): string =>
  (sql || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const callErrorCallback = (
  tx: Transaction,
  errorCallback: ExecuteSqlError | undefined,
  error: any,
) => {
  if (!errorCallback) {
    return;
  }
  if (errorCallback.length >= 2) {
    (errorCallback as (tx: Transaction, err: any) => void)(tx, error);
  } else {
    (errorCallback as (err: any) => void)(error);
  }
};

const n = (value: any, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const s = (value: any): string => String(value ?? '');
const sOrNull = (value: any): string | null => (value == null ? null : String(value));

const upsert = <T extends Record<string, any>>(
  rows: T[],
  key: keyof T,
  keyValue: any,
  row: T,
) => {
  const idx = rows.findIndex((r) => r[key] === keyValue);
  if (idx >= 0) {
    rows[idx] = row;
  } else {
    rows.push(row);
  }
};

const ensureDefaults = () => {
  for (const row of defaultSettings) {
    if (!store.app_settings.find((x) => x.setting_key === row.setting_key)) {
      store.app_settings.push(row);
    }
  }
};

const logWarnOnce = (message: string) => {
  if (warned) {
    return;
  }
  warned = true;
  console.log(`[SQLite] ${message}`);
};

const getPersistPath = async (): Promise<string | null> => {
  const pathCandidates = [
    RNFS.DocumentDirectoryPath,
    RNFS.TemporaryDirectoryPath,
    (RNFS as any).CachesDirectoryPath,
    (RNFS as any).ExternalDirectoryPath,
    (RNFS as any).LibraryDirectoryPath,
    (RNFS as any).MainBundlePath,
  ].filter((value) => typeof value === 'string' && value.length > 0);
  const baseDir = pathCandidates[0] ?? '';
  if (
    !baseDir ||
    typeof RNFS.exists !== 'function' ||
    typeof RNFS.mkdir !== 'function' ||
    typeof RNFS.readFile !== 'function' ||
    typeof RNFS.writeFile !== 'function'
  ) {
    return null;
  }

  const dir = `${baseDir}/socialmediascheduler`;
  try {
    const exists = await RNFS.exists(dir);
    if (!exists) {
      await RNFS.mkdir(dir);
    }
    const fullPath = `${dir}/sqlite-fallback-store.json`;
    if (!persistencePathLogged) {
      persistencePathLogged = true;
      console.log(`[SQLite] Fallback persistence file: ${fullPath}`);
    }
    return fullPath;
  } catch (error) {
    logWarnOnce(`Unable to initialize persistence directory: ${String(error)}`);
    return null;
  }
};

const recomputeSequences = () => {
  const maxContentId = store.content.reduce(
    (acc, row) => Math.max(acc, n(row.content_id, 0)),
    0,
  );
  contentSeq = Math.max(contentSeq, maxContentId + 1, 1);
  insertSeq = Math.max(insertSeq, contentSeq, 1);
};

const sanitizeStore = (value: any): Store => {
  const clean = emptyStore();
  const src = value && typeof value === 'object' ? value : {};
  const pick = (v: any, fallback: any[]) => (Array.isArray(v) ? v : fallback);
  return {
    user_providers: pick(src.user_providers, clean.user_providers),
    content: pick(src.content, clean.content),
    instagram_accounts: pick(src.instagram_accounts, clean.instagram_accounts),
    youtube_accounts: pick(src.youtube_accounts, clean.youtube_accounts),
    threads_accounts: pick(src.threads_accounts, clean.threads_accounts),
    linkedin_accounts: pick(src.linkedin_accounts, clean.linkedin_accounts),
    tiktok_accounts: pick(src.tiktok_accounts, clean.tiktok_accounts),
    twitter_accounts: pick(src.twitter_accounts, clean.twitter_accounts),
    bluesky_accounts: pick(src.bluesky_accounts, clean.bluesky_accounts),
    app_settings: pick(src.app_settings, clean.app_settings),
  };
};

const ensureLoaded = async () => {
  if (!isWindows || loaded) {
    return;
  }
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    const filePath = await getPersistPath();
    const hasAsyncStorage =
      AsyncStorage &&
      typeof AsyncStorage.getItem === 'function' &&
      typeof AsyncStorage.setItem === 'function';

    try {
      if (filePath) {
        const exists = await RNFS.exists(filePath);
        if (exists) {
          const raw = await RNFS.readFile(filePath, 'utf8');
          if (raw) {
            const parsed = JSON.parse(raw) as Persisted;
            store = sanitizeStore(parsed?.store);
            insertSeq = n(parsed?.insertSeq, 1);
            contentSeq = n(parsed?.contentSeq, 1);
          }
        }
      } else if (hasLegacyStorage()) {
        const raw = await legacyGetItem(ASYNC_PERSIST_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Persisted;
          store = sanitizeStore(parsed?.store);
          insertSeq = n(parsed?.insertSeq, 1);
          contentSeq = n(parsed?.contentSeq, 1);
        }
        if (!legacyStorageLogged) {
          legacyStorageLogged = true;
          console.log('[SQLite] Using NativeModules legacy storage fallback.');
        }
      } else if (hasAsyncStorage) {
        const raw = await AsyncStorage.getItem(ASYNC_PERSIST_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Persisted;
          store = sanitizeStore(parsed?.store);
          insertSeq = n(parsed?.insertSeq, 1);
          contentSeq = n(parsed?.contentSeq, 1);
        }
        if (!asyncStorageLogged) {
          asyncStorageLogged = true;
          console.log('[SQLite] Using AsyncStorage fallback persistence.');
        }
      } else {
        logWarnOnce('Windows fallback DB is running without persistence.');
      }
    } catch (error) {
      console.log(`[SQLite] Failed to load fallback DB file: ${String(error)}`);
      store = emptyStore();
      insertSeq = 1;
      contentSeq = 1;
    }

    ensureDefaults();
    recomputeSequences();
    loaded = true;
  })();

  return loadPromise;
};

const persist = async () => {
  if (!isWindows) {
    return;
  }
  const filePath = await getPersistPath();
  const hasAsyncStorage =
    AsyncStorage &&
    typeof AsyncStorage.getItem === 'function' &&
    typeof AsyncStorage.setItem === 'function';

  const payload: Persisted = {
    store,
    insertSeq,
    contentSeq,
  };

  if (filePath) {
    writeQueue = writeQueue
      .then(() => RNFS.writeFile(filePath, JSON.stringify(payload), 'utf8'))
      .catch((error: any) => {
        console.log(`[SQLite] Failed to persist fallback DB file: ${String(error)}`);
      });
  } else if (hasLegacyStorage()) {
    writeQueue = writeQueue
      .then(() => legacySetItem(ASYNC_PERSIST_KEY, JSON.stringify(payload)))
      .catch((error: any) => {
        console.log(`[SQLite] Failed to persist fallback DB in legacy storage: ${String(error)}`);
      });
  } else if (hasAsyncStorage) {
    writeQueue = writeQueue
      .then(() => AsyncStorage.setItem(ASYNC_PERSIST_KEY, JSON.stringify(payload)))
      .catch((error: any) => {
        console.log(`[SQLite] Failed to persist fallback DB in AsyncStorage: ${String(error)}`);
      });
  } else {
    logWarnOnce('Windows fallback DB is running without persistence.');
    return;
  }

  await writeQueue;
};

const createMockDb = (): SQLiteDatabase => {
  const tx: Transaction = {
    executeSql: (
      sqlStatement: string,
      args: any[] = [],
      callback?: ExecuteSqlSuccess,
      errorCallback?: ExecuteSqlError,
    ) => {
      void (async () => {
        try {
          await ensureLoaded();
          const sql = normalizeSql(sqlStatement);

          if (sql.startsWith('create table')) {
            callback?.(tx, makeResultSet([], 0));
            return;
          }

          if (sql.includes("select name from sqlite_master where type='table'")) {
            callback?.(tx, makeResultSet(TABLES.map((name) => ({ name }))));
            return;
          }

          if (sql.includes('insert or ignore into app_settings')) {
            ensureDefaults();
            await persist();
            callback?.(tx, makeResultSet([], 1));
            return;
          }

          if (sql.includes('insert into app_settings')) {
            upsert(store.app_settings, 'setting_key', s(args[0]), {
              setting_key: s(args[0]),
              setting_value: s(args[1]),
            });
            await persist();
            callback?.(tx, makeResultSet([], 1, insertSeq++));
            return;
          }

          if (sql.includes('update app_settings set setting_value')) {
            upsert(store.app_settings, 'setting_key', s(args[1]), {
              setting_key: s(args[1]),
              setting_value: s(args[0]),
            });
            await persist();
            callback?.(tx, makeResultSet([], 1));
            return;
          }

          if (sql.includes('select setting_value from app_settings where setting_key = ?')) {
            const row = store.app_settings.find((x) => x.setting_key === s(args[0]));
            callback?.(tx, makeResultSet(row ? [row] : []));
            return;
          }

          if (sql.includes('insert or replace into user_providers')) {
            upsert(store.user_providers, 'provider_user_id', s(args[1]), {
              provider_name: s(args[0]),
              provider_user_id: s(args[1]),
            });
            await persist();
            callback?.(tx, makeResultSet([], 1, insertSeq++));
            return;
          }

          if (sql.includes('delete from user_providers where provider_user_id = ?')) {
            const before = store.user_providers.length;
            store.user_providers = store.user_providers.filter(
              (r) => r.provider_user_id !== s(args[0]),
            );
            await persist();
            callback?.(tx, makeResultSet([], before - store.user_providers.length));
            return;
          }

          if (sql.includes('select count(*) as count from user_providers where provider_user_id = ?')) {
            const count = store.user_providers.filter(
              (r) => r.provider_user_id === s(args[0]),
            ).length;
            callback?.(tx, makeResultSet([{ count }]));
            return;
          }

          if (sql.includes('select count(*) as count from user_providers')) {
            callback?.(tx, makeResultSet([{ count: store.user_providers.length }]));
            return;
          }

          if (sql.includes('select user_id from user_providers where provider_user_id = ?')) {
            callback?.(tx, makeResultSet([]));
            return;
          }

          if (
            sql.includes('select provider_user_id, provider_name from user_providers where provider_user_id in')
          ) {
            const ids = args.map((x) => s(x));
            callback?.(
              tx,
              makeResultSet(store.user_providers.filter((r) => ids.includes(r.provider_user_id))),
            );
            return;
          }

          if (sql.includes('select provider_user_id, provider_name from user_providers')) {
            callback?.(tx, makeResultSet(store.user_providers));
            return;
          }

          if (sql.includes('insert into content')) {
            const newId = contentSeq++;
            store.content.push({
              content_id: newId,
              content_type: s(args[0]),
              content_data: s(args[1]),
              description: sOrNull(args[2]),
              user_providers: sOrNull(args[3]),
              post_date: n(args[4], 0),
              title: sOrNull(args[5]),
              privacy: sOrNull(args[6]),
              category: sOrNull(args[7]),
              selfDeclaredMadeForKids: Boolean(args[8]),
              thumbnail: sOrNull(args[9]),
              tags: sOrNull(args[10]),
              published: s(args[11] ?? '{}'),
            });
            await persist();
            callback?.(tx, makeResultSet([], 1, newId));
            return;
          }

          if (sql.includes('update content set content_data = ?')) {
            const id = args.length >= 6 ? n(args[5], 0) : n(args[4], 0);
            const published = args.length >= 6 ? s(args[4] ?? '{}') : '{}';
            const idx = store.content.findIndex((row) => row.content_id === id);
            if (idx >= 0) {
              store.content[idx] = {
                ...store.content[idx],
                content_data: s(args[0]),
                description: sOrNull(args[1]),
                post_date: n(args[2], 0),
                user_providers: sOrNull(args[3]),
                published,
              };
              await persist();
              callback?.(tx, makeResultSet([], 1));
            } else {
              callback?.(tx, makeResultSet([], 0));
            }
            return;
          }

          if (sql.includes('update content set published = ? where content_id = ?')) {
            const idx = store.content.findIndex((row) => row.content_id === n(args[1], 0));
            if (idx >= 0) {
              store.content[idx] = { ...store.content[idx], published: s(args[0] ?? '{}') };
              await persist();
              callback?.(tx, makeResultSet([], 1));
            } else {
              callback?.(tx, makeResultSet([], 0));
            }
            return;
          }

          if (sql.includes('delete from content where content_id = ?')) {
            const before = store.content.length;
            store.content = store.content.filter((row) => row.content_id !== n(args[0], 0));
            await persist();
            callback?.(tx, makeResultSet([], before - store.content.length));
            return;
          }

          if (
            sql.includes('select * from content where post_date between ? and ? and published not like')
          ) {
            const start = n(args[0], 0);
            const end = n(args[1], 0);
            const rows = store.content.filter(
              (row) =>
                row.post_date >= start &&
                row.post_date <= end &&
                !s(row.published).includes('"final":"success"'),
            );
            callback?.(tx, makeResultSet(rows));
            return;
          }

          if (sql.includes('select * from content where post_date between ? and ?')) {
            const start = n(args[0], 0);
            const end = n(args[1], 0);
            callback?.(
              tx,
              makeResultSet(
                store.content.filter((row) => row.post_date >= start && row.post_date <= end),
              ),
            );
            return;
          }

          if (sql.includes("select * from content where post_date < ? and published = '{}'")) {
            const limit = n(args[0], 0);
            callback?.(
              tx,
              makeResultSet(
                store.content.filter((row) => row.post_date < limit && s(row.published) === '{}'),
              ),
            );
            return;
          }

          if (sql.includes('select post_date from content where published not like')) {
            callback?.(
              tx,
              makeResultSet(
                store.content
                  .filter((row) => !s(row.published).includes('"final":"success"'))
                  .map((row) => ({ post_date: row.post_date })),
              ),
            );
            return;
          }

          const accountHandlers: Array<{
            table: keyof Store;
            insert: string;
            update: string;
            select: string;
            deleteSql: string;
            key: string;
            makeInsertRow: (a: any[]) => any;
            makeUpdateRow: (a: any[], existing: any, keyValue: string) => any;
          }> = [
            {
              table: 'instagram_accounts',
              insert: 'insert into instagram_accounts',
              update: 'update instagram_accounts',
              select: 'where instagram_accounts.sub_id = ?',
              deleteSql: 'delete from instagram_accounts where sub_id = ?',
              key: 'sub_id',
              makeInsertRow: (a) => ({
                sub_id: s(a[0]),
                access_token: s(a[1]),
                access_token_expires_in: s(a[2]),
                timestamp: s(a[3]),
                account_name: s(a[4]),
              }),
              makeUpdateRow: (a, existing, keyValue) => ({
                sub_id: keyValue,
                access_token: s(a[0] ?? existing?.access_token ?? ''),
                access_token_expires_in: s(a[1] ?? existing?.access_token_expires_in ?? ''),
                timestamp: s(a[2] ?? existing?.timestamp ?? ''),
                account_name: s(a[3] ?? existing?.account_name ?? ''),
              }),
            },
            {
              table: 'youtube_accounts',
              insert: 'insert into youtube_accounts',
              update: 'update youtube_accounts',
              select: 'where youtube_accounts.sub_id = ?',
              deleteSql: 'delete from youtube_accounts where sub_id = ?',
              key: 'sub_id',
              makeInsertRow: (a) => ({
                sub_id: s(a[0]),
                access_token: s(a[1]),
                access_token_expires_in: s(a[2]),
                timestamp: s(a[3]),
                account_name: s(a[4]),
              }),
              makeUpdateRow: (a, existing, keyValue) => ({
                sub_id: keyValue,
                access_token: s(a[0] ?? existing?.access_token ?? ''),
                access_token_expires_in: s(a[1] ?? existing?.access_token_expires_in ?? ''),
                timestamp: s(a[2] ?? existing?.timestamp ?? ''),
                account_name: s(a[3] ?? existing?.account_name ?? ''),
              }),
            },
            {
              table: 'threads_accounts',
              insert: 'insert into threads_accounts',
              update: 'update threads_accounts',
              select: 'where threads_accounts.sub_id = ?',
              deleteSql: 'delete from threads_accounts where sub_id = ?',
              key: 'sub_id',
              makeInsertRow: (a) => ({
                sub_id: s(a[0]),
                access_token: s(a[1]),
                access_token_expires_in: s(a[2]),
                timestamp: s(a[3]),
                account_name: s(a[4]),
              }),
              makeUpdateRow: (a, existing, keyValue) => ({
                sub_id: keyValue,
                access_token: s(a[0] ?? existing?.access_token ?? ''),
                access_token_expires_in: s(a[1] ?? existing?.access_token_expires_in ?? ''),
                timestamp: s(a[2] ?? existing?.timestamp ?? ''),
                account_name: s(a[3] ?? existing?.account_name ?? ''),
              }),
            },
            {
              table: 'linkedin_accounts',
              insert: 'insert into linkedin_accounts',
              update: 'update linkedin_accounts',
              select: 'where linkedin_accounts.sub_id = ?',
              deleteSql: 'delete from linkedin_accounts where sub_id = ?',
              key: 'sub_id',
              makeInsertRow: (a) => ({
                app_token: s(a[0]),
                app_refresh_token: a[1] ?? null,
                app_token_expires_in: a[2] ?? '',
                app_token_refresh_expires_in: a[3] ?? null,
                account_name: s(a[4]),
                timestamp: s(a[5]),
                sub_id: s(a[6]),
              }),
              makeUpdateRow: (a, existing, keyValue) => ({
                app_token: s(a[0] ?? existing?.app_token ?? ''),
                app_refresh_token: a[1] ?? existing?.app_refresh_token ?? null,
                app_token_expires_in: a[2] ?? existing?.app_token_expires_in ?? '',
                app_token_refresh_expires_in:
                  a[3] ?? existing?.app_token_refresh_expires_in ?? null,
                account_name: s(a[4] ?? existing?.account_name ?? ''),
                timestamp: s(existing?.timestamp ?? new Date().toISOString()),
                sub_id: keyValue,
              }),
            },
            {
              table: 'tiktok_accounts',
              insert: 'insert into tiktok_accounts',
              update: 'update tiktok_accounts',
              select: 'where tiktok_accounts.sub_id = ?',
              deleteSql: 'delete from tiktok_accounts where sub_id = ?',
              key: 'sub_id',
              makeInsertRow: (a) => ({
                sub_id: s(a[0]),
                access_token: s(a[1]),
                refresh_token: s(a[2]),
                access_token_expires_in: s(a[3]),
                refresh_token_expires_in: s(a[4]),
                timestamp: s(a[5]),
                account_name: s(a[6]),
              }),
              makeUpdateRow: (a, existing, keyValue) => ({
                sub_id: keyValue,
                access_token: s(a[0] ?? existing?.access_token ?? ''),
                access_token_expires_in: s(a[1] ?? existing?.access_token_expires_in ?? ''),
                refresh_token: s(a[2] ?? existing?.refresh_token ?? ''),
                refresh_token_expires_in: s(a[3] ?? existing?.refresh_token_expires_in ?? ''),
                timestamp: s(a[4] ?? existing?.timestamp ?? ''),
                account_name: s(a[5] ?? existing?.account_name ?? ''),
              }),
            },
            {
              table: 'bluesky_accounts',
              insert: 'insert into bluesky_accounts',
              update: 'update bluesky_accounts',
              select: 'where bluesky_accounts.sub_id = ?',
              deleteSql: 'delete from bluesky_accounts where sub_id = ?',
              key: 'sub_id',
              makeInsertRow: (a) => ({
                sub_id: s(a[0]),
                access_token: s(a[1]),
                access_token_expires_in: s(a[2]),
                timestamp: s(a[3]),
                account_name: s(a[4]),
              }),
              makeUpdateRow: (a, existing, keyValue) => ({
                sub_id: keyValue,
                access_token: s(a[0] ?? existing?.access_token ?? ''),
                access_token_expires_in: s(a[1] ?? existing?.access_token_expires_in ?? ''),
                timestamp: s(a[2] ?? existing?.timestamp ?? ''),
                account_name: s(a[3] ?? existing?.account_name ?? ''),
              }),
            },
          ];

          for (const handler of accountHandlers) {
            const rows = store[handler.table] as any[];

            if (sql.includes(handler.insert)) {
              const row = handler.makeInsertRow(args);
              upsert(rows, handler.key as any, row[handler.key], row);
              await persist();
              callback?.(tx, makeResultSet([], 1, insertSeq++));
              return;
            }

            if (sql.includes(handler.update)) {
              const keyValue =
                handler.table === 'linkedin_accounts' ? s(args[5] ?? args[6]) : s(args[4] ?? args[6]);
              const existing = rows.find((r) => s(r[handler.key]) === keyValue);
              const row = handler.makeUpdateRow(args, existing, keyValue);
              upsert(rows, handler.key as any, keyValue, row);
              await persist();
              callback?.(tx, makeResultSet([], 1));
              return;
            }

            if (sql.includes(handler.deleteSql)) {
              const before = rows.length;
              const keyValue = s(args[0]);
              store[handler.table] = rows.filter((r) => s(r[handler.key]) !== keyValue) as any;
              await persist();
              callback?.(tx, makeResultSet([], before - (store[handler.table] as any[]).length));
              return;
            }

            if (sql.includes(`from ${handler.table}`) && sql.includes(handler.select)) {
              const row = rows.find((r) => s(r[handler.key]) === s(args[0]));
              callback?.(tx, makeResultSet(row ? [row] : []));
              return;
            }
          }

          if (sql.includes('insert into twitter_accounts')) {
            const row = {
              twitter_consumer_key: s(args[0]),
              twitter_consumer_secret: s(args[1]),
              twitter_access_token: s(args[2]),
              twitter_access_token_secret: s(args[3]),
              account_name: s(args[4]),
              sub_id: s(args[5]),
            };
            upsert(store.twitter_accounts, 'sub_id', row.sub_id, row);
            await persist();
            callback?.(tx, makeResultSet([], 1, insertSeq++));
            return;
          }

          if (sql.includes('delete from twitter_accounts where sub_id = ?')) {
            const before = store.twitter_accounts.length;
            store.twitter_accounts = store.twitter_accounts.filter((r) => s(r.sub_id) !== s(args[0]));
            await persist();
            callback?.(tx, makeResultSet([], before - store.twitter_accounts.length));
            return;
          }

          if (
            sql.includes('from twitter_accounts') &&
            sql.includes('where twitter_accounts.sub_id = ?')
          ) {
            const row = store.twitter_accounts.find((r) => s(r.sub_id) === s(args[0]));
            callback?.(tx, makeResultSet(row ? [row] : []));
            return;
          }

          if (
            sql.includes('from user_providers lp') &&
            sql.includes('join linkedin_accounts la')
          ) {
            const rows = store.user_providers
              .map((providerRow) => {
                const linkedInRow = store.linkedin_accounts.find(
                  (accountRow) => s(accountRow.sub_id) === s(providerRow.provider_user_id),
                );
                if (!linkedInRow) {
                  return null;
                }
                return {
                  id: providerRow.provider_user_id,
                  accountName: linkedInRow.account_name,
                  expiresInSec: linkedInRow.app_token_expires_in,
                  issuedIso: linkedInRow.timestamp,
                };
              })
              .filter(Boolean);
            callback?.(tx, makeResultSet(rows as any[]));
            return;
          }

          if (sql.includes('select * from linkedin_accounts')) {
            callback?.(tx, makeResultSet(store.linkedin_accounts));
            return;
          }

          if (sql.includes('select * from twitter_accounts')) {
            callback?.(tx, makeResultSet(store.twitter_accounts));
            return;
          }

          if (sql.includes('select * from user_providers')) {
            callback?.(tx, makeResultSet(store.user_providers));
            return;
          }

          if (sql.includes('select * from content')) {
            callback?.(tx, makeResultSet(store.content));
            return;
          }

          callback?.(tx, makeResultSet([]));
        } catch (error) {
          callErrorCallback(tx, errorCallback, error);
        }
      })();
    },
  };

  const db: SQLiteDatabase = {
    transaction: (fn, error, success) => {
      try {
        fn(tx);
        success?.();
      } catch (e) {
        error?.(e);
      }
    },
    readTransaction: (fn, error, success) => {
      try {
        fn(tx);
        success?.();
      } catch (e) {
        error?.(e);
      }
    },
    close: (success?: () => void) => {
      success?.();
    },
    executeSql: tx.executeSql,
  };

  return db;
};

function openDatabase(params: DatabaseParams): Promise<SQLiteDatabase> | SQLiteDatabase;
function openDatabase(
  params: DatabaseParams,
  success?: (db: SQLiteDatabase) => void,
  error?: (e: any) => void,
): SQLiteDatabase;
function openDatabase(
  params: DatabaseParams,
  success?: (db: SQLiteDatabase) => void,
  error?: (e: any) => void,
): Promise<SQLiteDatabase> | SQLiteDatabase {
  if (isWindows) {
    const mockDb = createMockDb();
    void ensureLoaded();

    if (typeof success === 'function') {
      setTimeout(() => {
        try {
          success(mockDb);
        } catch (callbackError) {
          error?.(callbackError);
        }
      }, 0);
    }

    console.log(
      '[SQLite] Windows fallback DB in use (react-native-sqlite-storage native module disabled).',
    );
    return mockDb;
  }

  return (SQLiteNative as any).openDatabase(params, success, error);
}

const SQLite = {
  ...SQLiteNative,
  openDatabase,
};

export default SQLite;
