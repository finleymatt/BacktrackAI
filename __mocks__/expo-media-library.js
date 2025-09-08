export const requestPermissionsAsync = jest.fn(() =>
  Promise.resolve({ status: 'granted' })
);
export const getAssetsAsync = jest.fn(() => Promise.resolve({ assets: [] }));
export const createAssetAsync = jest.fn(() =>
  Promise.resolve({ id: 'mock-asset-id' })
);

export default {
  requestPermissionsAsync,
  getAssetsAsync,
  createAssetAsync,
};
