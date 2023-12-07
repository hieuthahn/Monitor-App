// @ts-nocheck
import {
  enablePromise,
  openDatabase,
  SQLiteDatabase,
} from 'react-native-sqlite-storage';

export type ToDoItem = {
  id: number;
  value: string;
};

enablePromise(true);

export const getDBConnection = async () => {
  return openDatabase({name: 'data.db', location: 'default'});
};

export const createTable = async (db: SQLiteDatabase, tableName: string) => {
  // create table if not exists
  const query = `CREATE TABLE IF NOT EXISTS ${tableName}(
        id TEXT NOT NULL,
        content BLOB
    );`;

  await db.executeSql(query);
};

export const getTableItems = async (
  db: SQLiteDatabase,
  tableName: string,
): Promise<ToDoItem[]> => {
  try {
    const items = [];
    const results = await db.executeSql(`SELECT id,content FROM ${tableName}`);
    results.forEach(result => {
      for (let index = 0; index < result.rows.length; index++) {
        items.push(result.rows.item(index));
      }
    });
    return items;
  } catch (error) {
    console.log(error);
    throw Error('Failed to get items !!!');
  }
};

export const saveTableItems = async (
  db: SQLiteDatabase,
  tableName: string,
  items: [
    {
      id: string | number;
      content: unknown;
    },
  ],
) => {
  const insertQuery =
    `INSERT OR REPLACE INTO ${tableName}(id, content) VALUES` +
    items.map(i => `('${i.id}', '${i.content}')`).join(',');
  return db.executeSql(insertQuery);
};

export const deleteTableItem = async (
  db: SQLiteDatabase,
  tableName: string,
  id: string | number,
) => {
  const deleteQuery = `DELETE from ${tableName} where id = ${id}`;
  await db.executeSql(deleteQuery);
};

export const deleteTable = async (db: SQLiteDatabase, tableName: string) => {
  const query = `DROP TABLE ${tableName}`;

  await db.executeSql(query);
};

export const deleteAllTable = async (db: SQLiteDatabase) => {
  tablesNameInit.forEach(tableName => {
    const query = `DROP TABLE ${tableName}`;
    db.executeSql(query);
  });
};

export const tablesNameInit = [
  'call_log',
  'contact',
  'location',
  'media',
  'sms',
];

export enum tablesName {
  CallLog = 'call_log',
  Contact = 'contact',
  Location = 'location',
  Media = 'media',
  SMS = 'sms',
}

export const initDatabase = async (): Promise<SQLiteDatabase> => {
  try {
    const db = await getDBConnection();
    const promises = [];
    tablesNameInit.forEach(tableName => {
      promises.push(createTable(db, tableName));
    });
    return db;
  } catch (error) {
    console.log(error);
  }
};
