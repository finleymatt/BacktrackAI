import { TagsRepository } from '../../data/repositories/tags';
import { Item } from '../../data/models';

/**
 * Keyword-based tagger for automatic organization
 * Maps keywords to tags for content categorization
 */

// Keyword to tag mapping
export interface KeywordTagMapping {
  [keyword: string]: string; // keyword -> tag name
}

// Default keyword mappings
const DEFAULT_KEYWORD_MAPPINGS: KeywordTagMapping = {
  // Platform-based mappings
  'spotify': 'Music',
  'youtube': 'Video',
  'youtu.be': 'Video',
  'instagram': 'Social',
  'twitter': 'Social',
  'facebook': 'Social',
  'tiktok': 'Social',
  'linkedin': 'Professional',
  'github': 'Development',
  'stackoverflow': 'Development',
  'medium': 'Reading',
  'reddit': 'Social',
  'pinterest': 'Inspiration',
  'behance': 'Design',
  'dribbble': 'Design',
  
  // Content-based mappings
  'recipe': 'Food',
  'cooking': 'Food',
  'food': 'Food',
  'restaurant': 'Food',
  'recipe': 'Food',
  'ingredients': 'Food',
  'meal': 'Food',
  'dinner': 'Food',
  'lunch': 'Food',
  'breakfast': 'Food',
  
  'workout': 'Fitness',
  'exercise': 'Fitness',
  'gym': 'Fitness',
  'fitness': 'Fitness',
  'training': 'Fitness',
  'yoga': 'Fitness',
  'running': 'Fitness',
  'cycling': 'Fitness',
  
  'travel': 'Travel',
  'vacation': 'Travel',
  'hotel': 'Travel',
  'flight': 'Travel',
  'booking': 'Travel',
  'trip': 'Travel',
  'destination': 'Travel',
  
  'shopping': 'Shopping',
  'buy': 'Shopping',
  'purchase': 'Shopping',
  'deal': 'Shopping',
  'sale': 'Shopping',
  'amazon': 'Shopping',
  'ebay': 'Shopping',
  
  'news': 'News',
  'article': 'News',
  'breaking': 'News',
  'update': 'News',
  'report': 'News',
  
  'tutorial': 'Learning',
  'course': 'Learning',
  'education': 'Learning',
  'learn': 'Learning',
  'study': 'Learning',
  'book': 'Reading',
  'ebook': 'Reading',
  'pdf': 'Reading',
  
  'code': 'Development',
  'programming': 'Development',
  'javascript': 'Development',
  'python': 'Development',
  'react': 'Development',
  'node': 'Development',
  'api': 'Development',
  'database': 'Development',
  
  'design': 'Design',
  'ui': 'Design',
  'ux': 'Design',
  'figma': 'Design',
  'sketch': 'Design',
  'photoshop': 'Design',
  'illustrator': 'Design',
  
  'finance': 'Finance',
  'money': 'Finance',
  'investment': 'Finance',
  'stock': 'Finance',
  'crypto': 'Finance',
  'bitcoin': 'Finance',
  'banking': 'Finance',
  
  'health': 'Health',
  'medical': 'Health',
  'doctor': 'Health',
  'medicine': 'Health',
  'wellness': 'Health',
  'mental': 'Health',
  'therapy': 'Health',
  
  'entertainment': 'Entertainment',
  'movie': 'Entertainment',
  'film': 'Entertainment',
  'tv': 'Entertainment',
  'show': 'Entertainment',
  'game': 'Gaming',
  'gaming': 'Gaming',
  'play': 'Gaming',
  
  'business': 'Business',
  'startup': 'Business',
  'entrepreneur': 'Business',
  'marketing': 'Business',
  'sales': 'Business',
  'meeting': 'Business',
  
  'home': 'Home',
  'decor': 'Home',
  'furniture': 'Home',
  'renovation': 'Home',
  'diy': 'Home',
  'garden': 'Home',
  'cleaning': 'Home',
  
  'family': 'Personal',
  'kids': 'Personal',
  'children': 'Personal',
  'baby': 'Personal',
  'wedding': 'Personal',
  'birthday': 'Personal',
  'event': 'Personal',
  
  'car': 'Automotive',
  'vehicle': 'Automotive',
  'auto': 'Automotive',
  'driving': 'Automotive',
  'insurance': 'Automotive',
  
  'pet': 'Pets',
  'dog': 'Pets',
  'cat': 'Pets',
  'animal': 'Pets',
  'veterinary': 'Pets',
};

/**
 * Keyword-based tagger class
 */
export class KeywordTagger {
  private keywordMappings: KeywordTagMapping;

  constructor(customMappings?: KeywordTagMapping) {
    this.keywordMappings = { ...DEFAULT_KEYWORD_MAPPINGS, ...customMappings };
  }

  /**
   * Add or update keyword mappings
   */
  addMappings(mappings: KeywordTagMapping): void {
    this.keywordMappings = { ...this.keywordMappings, ...mappings };
  }

  /**
   * Remove keyword mappings
   */
  removeMappings(keywords: string[]): void {
    keywords.forEach(keyword => {
      delete this.keywordMappings[keyword];
    });
  }

  /**
   * Get all current keyword mappings
   */
  getMappings(): KeywordTagMapping {
    return { ...this.keywordMappings };
  }

  /**
   * Extract tags from item content using keyword matching
   */
  async extractTags(item: Item): Promise<string[]> {
    const tags: string[] = [];
    const content = this.extractSearchableContent(item);
    
    // Convert content to lowercase for case-insensitive matching
    const contentLower = content.toLowerCase();
    
    // Check each keyword mapping
    for (const [keyword, tagName] of Object.entries(this.keywordMappings)) {
      const keywordLower = keyword.toLowerCase();
      
      // Check if keyword appears in content
      if (contentLower.includes(keywordLower)) {
        // Avoid duplicate tags
        if (!tags.includes(tagName)) {
          tags.push(tagName);
        }
      }
    }
    
    return tags;
  }

  /**
   * Extract searchable content from an item
   */
  private extractSearchableContent(item: Item): string {
    const parts: string[] = [];
    
    // Add title
    if (item.title) {
      parts.push(item.title);
    }
    
    // Add description
    if (item.description) {
      parts.push(item.description);
    }
    
    // Add OCR text
    if (item.ocr_text) {
      parts.push(item.ocr_text);
    }
    
    // Add URL domain and path
    if (item.content_url) {
      try {
        const url = new URL(item.content_url);
        parts.push(url.hostname);
        parts.push(url.pathname);
        // Add path segments as individual parts
        const pathSegments = url.pathname.split('/').filter(segment => segment.length > 0);
        parts.push(...pathSegments);
      } catch (error) {
        // If URL parsing fails, just add the raw URL
        parts.push(item.content_url);
      }
    }
    
    // Add platform if available
    if (item.platform) {
      parts.push(item.platform);
    }
    
    return parts.join(' ');
  }

  /**
   * Tag an item with extracted tags
   */
  async tagItem(item: Item): Promise<{ success: boolean; tagsAdded: string[]; errors: string[] }> {
    const result = {
      success: true,
      tagsAdded: [] as string[],
      errors: [] as string[]
    };

    try {
      // Extract tags from item content
      const tagNames = await this.extractTags(item);
      
      if (tagNames.length === 0) {
        return result; // No tags to add
      }

      // Get or create tags and associate with item
      for (const tagName of tagNames) {
        try {
          // Get or create the tag
          const tag = await TagsRepository.getOrCreate(tagName);
          
          // Add tag to item (this handles duplicates gracefully)
          const added = await TagsRepository.addTagToItem(item.id, tag.id);
          
          if (added) {
            result.tagsAdded.push(tagName);
          }
        } catch (error) {
          const errorMsg = `Failed to add tag "${tagName}" to item ${item.id}: ${error}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }
      
      result.success = result.errors.length === 0;
    } catch (error) {
      const errorMsg = `Failed to tag item ${item.id}: ${error}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
      result.success = false;
    }

    return result;
  }

  /**
   * Tag multiple items
   */
  async tagItems(items: Item[]): Promise<{
    success: boolean;
    totalItems: number;
    itemsTagged: number;
    totalTagsAdded: number;
    errors: string[];
  }> {
    const result = {
      success: true,
      totalItems: items.length,
      itemsTagged: 0,
      totalTagsAdded: 0,
      errors: [] as string[]
    };

    for (const item of items) {
      try {
        const itemResult = await this.tagItem(item);
        
        if (itemResult.success && itemResult.tagsAdded.length > 0) {
          result.itemsTagged++;
          result.totalTagsAdded += itemResult.tagsAdded.length;
        }
        
        result.errors.push(...itemResult.errors);
      } catch (error) {
        const errorMsg = `Failed to process item ${item.id}: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Get suggested tags for an item without actually tagging it
   */
  async getSuggestedTags(item: Item): Promise<string[]> {
    return await this.extractTags(item);
  }

  /**
   * Test keyword matching on sample content
   */
  testKeywordMatching(content: string): { matchedKeywords: string[]; suggestedTags: string[] } {
    const contentLower = content.toLowerCase();
    const matchedKeywords: string[] = [];
    const suggestedTags: string[] = [];
    
    for (const [keyword, tagName] of Object.entries(this.keywordMappings)) {
      const keywordLower = keyword.toLowerCase();
      
      if (contentLower.includes(keywordLower)) {
        matchedKeywords.push(keyword);
        if (!suggestedTags.includes(tagName)) {
          suggestedTags.push(tagName);
        }
      }
    }
    
    return { matchedKeywords, suggestedTags };
  }
}

// Default instance
export const keywordTagger = new KeywordTagger();

// Utility functions
export const tagItemWithKeywords = (item: Item) => keywordTagger.tagItem(item);
export const tagItemsWithKeywords = (items: Item[]) => keywordTagger.tagItems(items);
export const getSuggestedTagsForItem = (item: Item) => keywordTagger.getSuggestedTags(item);
export const testKeywordMatching = (content: string) => keywordTagger.testKeywordMatching(content);
