export const documentDirectory = 'file:///mock/document/directory/';
export const readAsStringAsync = jest.fn(() => Promise.resolve(''));
export const writeAsStringAsync = jest.fn(() => Promise.resolve());
export const deleteAsync = jest.fn(() => Promise.resolve());
export const makeDirectoryAsync = jest.fn(() => Promise.resolve());
export const getInfoAsync = jest.fn(() => Promise.resolve({ exists: false }));

export default {
  documentDirectory,
  readAsStringAsync,
  writeAsStringAsync,
  deleteAsync,
  makeDirectoryAsync,
  getInfoAsync,
};
