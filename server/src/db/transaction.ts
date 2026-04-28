import { rawDb } from "./connection";

let savepointCounter = 0;

export async function runInTransaction<T>(work: () => Promise<T>): Promise<T> {
  if (rawDb.inTransaction) {
    const savepoint = `sp_${Date.now()}_${savepointCounter++}`;
    rawDb.exec(`SAVEPOINT ${savepoint}`);
    try {
      const result = await work();
      rawDb.exec(`RELEASE SAVEPOINT ${savepoint}`);
      return result;
    } catch (error) {
      rawDb.exec(`ROLLBACK TO SAVEPOINT ${savepoint}`);
      rawDb.exec(`RELEASE SAVEPOINT ${savepoint}`);
      throw error;
    }
  }

  rawDb.exec("BEGIN IMMEDIATE");
  try {
    const result = await work();
    rawDb.exec("COMMIT");
    return result;
  } catch (error) {
    rawDb.exec("ROLLBACK");
    throw error;
  }
}
