// Simple test for keyword tagger without complex Item types
describe('KeywordTagger Simple Tests', () => {
  it('should create a new instance', () => {
    const { KeywordTagger } = require('../keywordTagger');
    const tagger = new KeywordTagger();
    expect(tagger).toBeDefined();
  });

  it('should have default mappings', () => {
    const { KeywordTagger } = require('../keywordTagger');
    const tagger = new KeywordTagger();
    const mappings = tagger.getMappings();
    expect(mappings).toHaveProperty('spotify');
    expect(mappings).toHaveProperty('youtube');
  });

  it('should test keyword matching', () => {
    const { KeywordTagger } = require('../keywordTagger');
    const tagger = new KeywordTagger();
    const result = tagger.testKeywordMatching('Check out this Spotify playlist');
    expect(result.matchedKeywords).toContain('spotify');
    expect(result.suggestedTags).toContain('Music');
  });
});
