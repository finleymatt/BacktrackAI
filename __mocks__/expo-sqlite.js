const mockDatabase = {
  transaction: jest.fn(callback => {
    const mockTransaction = {
      executeSql: jest.fn((sql, params, successCallback, errorCallback) => {
        // Mock successful execution
        if (successCallback) {
          successCallback(null, { rows: { _array: [] } });
        }
      }),
    };
    callback(mockTransaction);
  }),
  readTransaction: jest.fn(callback => {
    const mockTransaction = {
      executeSql: jest.fn((sql, params, successCallback, errorCallback) => {
        // Mock successful execution
        if (successCallback) {
          successCallback(null, { rows: { _array: [] } });
        }
      }),
    };
    callback(mockTransaction);
  }),
  close: jest.fn(),
  version: '1.0',
  exec: jest.fn(),
};

export const openDatabase = jest.fn(() => mockDatabase);
export default { openDatabase };
