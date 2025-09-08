// Mock for the database module
const getDatabase = jest.fn(() =>
  Promise.resolve({
    getAllAsync: jest.fn(() => Promise.resolve([])),
    runAsync: jest.fn(() =>
      Promise.resolve({ changes: 0, lastInsertRowId: 1 })
    ),
    execAsync: jest.fn(() => Promise.resolve()),
    transaction: jest.fn(callback => {
      const mockTransaction = {
        executeSql: jest.fn((sql, params, successCallback, errorCallback) => {
          if (successCallback) {
            successCallback(null, { rows: { _array: [] } });
          }
        }),
      };
      callback(mockTransaction);
    }),
  })
);

module.exports = { getDatabase };
