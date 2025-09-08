const TextRecognition = {
  recognize: jest.fn(() => Promise.resolve([{ text: 'Mocked OCR text' }])),
};

module.exports = { TextRecognition };
