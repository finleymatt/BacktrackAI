// Mock for the TagsRepository
const mockTagsRepository = {
  getOrCreate: jest.fn(() =>
    Promise.resolve({
      id: '1',
      name: 'MockTag',
      color: '#FF6B6B',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    })
  ),
  addTagToItem: jest.fn(() => Promise.resolve(true)),
  removeTagFromItem: jest.fn(() => Promise.resolve(true)),
  getTagsForItem: jest.fn(() => Promise.resolve([])),
  getAllTags: jest.fn(() => Promise.resolve([])),
  deleteTag: jest.fn(() => Promise.resolve(true)),
  updateTag: jest.fn(() => Promise.resolve(true)),
};

module.exports = {
  TagsRepository: mockTagsRepository,
};
