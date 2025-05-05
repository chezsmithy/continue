import { jest } from "@jest/globals";
// Use type-only import 
import type * as LanceType from "@lancedb/lancedb";

import { testConfigHandler, testIde } from "../test/fixtures";
import { addToTestDir } from "../test/testDir";
import { getLanceDbPath } from "../util/paths";

import { LanceDbIndex } from "./LanceDbIndex";
import { DatabaseConnection, SqliteDb } from "./refreshIndex";
import {
  mockFileContents,
  mockFilename,
  mockPathAndCacheKey,
  mockTag,
  updateIndexAndAwaitGenerator,
} from "./test/indexing";
import { IndexResultType } from "./types";

jest.useFakeTimers();

describe("ChunkCodebaseIndex", () => {
  let index: LanceDbIndex;
  let sqliteDb: DatabaseConnection;
  let lanceDb: LanceType.Connection;
  // Store lance dynamically like the main class does
  let lance: typeof LanceType;

  async function getAllSqliteLanceDbCache() {
    return await sqliteDb.all("SELECT * FROM lance_db_cache");
  }

  beforeAll(async () => {
    const { config: mockConfig } = await testConfigHandler.loadConfig();
    if (!mockConfig) {
      throw new Error("Failed to load config");
    }
    if (!mockConfig.selectedModelByRole.embed) {
      throw new Error("No embeddings model selected");
    }

    // Setup test file
    addToTestDir([[mockFilename, mockFileContents]]);

    // Dynamically import lance just like the LanceDbIndex class does
    lance = await import("@lancedb/lancedb");

    index = (await LanceDbIndex.create(
      mockConfig.selectedModelByRole.embed,
      testIde.readFile.bind(testIde),
    ))!;

    sqliteDb = await SqliteDb.get();
    lanceDb = await lance.connect(getLanceDbPath());
  });

  // Proper cleanup to prevent open handles
  afterAll(async () => {
    // Close database connections
    if (sqliteDb) {
      await sqliteDb.close();
    }
    
    // Close LanceDB connection if available
    if (lanceDb && typeof lanceDb.close === 'function') {
      await lanceDb.close();
    }
    
    // Force garbage collection if possible
    if (global.gc) {
      global.gc();
    }
  });

  /**
   * Some notes on quirks of this test:
   * - Currently, it appears that there is a race condition in LanceDB that
   *   requires us to re-open the table connection each time we want to read
   *   from it. Attempting to follow these docs did not resolve the issue:
   *   https://lancedb.github.io/lancedb/guides/tables/#consistency
   *
   * - We cannot open either the 'dev' or 'main' tag tables ubtil after we
   *   can assume they've been created through `updateIndexAndAwaitGenerator`
   */
  it("should update the index and maintain expected database state", async () => {
    const mainTag = mockTag;
    const mainTagTableName = index.tableNameForTag(mainTag);

    const devTag = { ...mockTag, branch: "dev" };
    const devTagTableName = index.tableNameForTag(devTag);

    const mockMarkComplete = jest
      .fn()
      .mockImplementation(() => Promise.resolve()) as any;

    // Compute test - inserts into both LanceDB and Sqlite
    await updateIndexAndAwaitGenerator(
      index,
      "compute",
      mockMarkComplete,
      mainTag,
    );
    let mainTagTable = await lanceDb.openTable(mainTagTableName);
    expect(await mainTagTable.countRows()).toBe(1);
    expect((await getAllSqliteLanceDbCache()).length).toBe(1);
    expect(mockMarkComplete).toHaveBeenCalledWith(
      [mockPathAndCacheKey],
      IndexResultType.Compute,
    );

    // AddTag test - only inserts into Lance DB
    await updateIndexAndAwaitGenerator(
      index,
      "addTag",
      mockMarkComplete,
      devTag,
    );
    let devTagTable = await lanceDb.openTable(devTagTableName);
    expect(await devTagTable.countRows()).toBe(1);
    expect(mockMarkComplete).toHaveBeenCalledWith(
      [mockPathAndCacheKey],
      IndexResultType.AddTag,
    );

    // RemoveTag - only removes from  Lance DB
    await updateIndexAndAwaitGenerator(
      index,
      "removeTag",
      mockMarkComplete,
      devTag,
    );
    devTagTable = await lanceDb.openTable(devTagTableName);
    expect(await devTagTable.countRows()).toBe(0);
    expect(mockMarkComplete).toHaveBeenCalledWith(
      [mockPathAndCacheKey],
      IndexResultType.RemoveTag,
    );

    // Delete test - removes from LanceDB and Sqlite
    await updateIndexAndAwaitGenerator(index, "del", mockMarkComplete, mainTag);
    mainTagTable = await lanceDb.openTable(mainTagTableName);
    expect(await mainTagTable.countRows()).toBe(0);
    expect((await getAllSqliteLanceDbCache()).length).toBe(0);
    expect(mockMarkComplete).toHaveBeenCalledWith(
      [mockPathAndCacheKey],
      IndexResultType.Delete,
    );
  });
});
