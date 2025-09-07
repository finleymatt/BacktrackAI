import { Platform } from '../../data/models';
import { ItemsRepository, CreateItemData } from '../../data/repositories/items';

// oEmbed response interface
interface OEmbedResponse {
  type?: string;
  version?: string;
  title?: string;
  author_name?: string;
  author_url?: string;
  provider_name?: string;
  provider_url?: string;
  cache_age?: number;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  url?: string;
  width?: number;
  height?: number;
  html?: string;
}

// URL metadata interface
interface UrlMetadata {
  title: string;
  description?: string;
  thumbnail_url?: string;
  platform: Platform;
}

// Platform detection patterns
const PLATFORM_PATTERNS: Record<string, Platform> = {
  'youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'spotify.com': 'spotify',
  'open.spotify.com': 'spotify',
  'instagram.com': 'instagram',
  'www.instagram.com': 'instagram',
};

/**
 * Detects the platform from a URL
 */
export function detectPlatform(url: string): Platform {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check for exact matches first
    if (PLATFORM_PATTERNS[hostname]) {
      return PLATFORM_PATTERNS[hostname];
    }
    
    // Check for partial matches
    for (const [pattern, platform] of Object.entries(PLATFORM_PATTERNS)) {
      if (hostname.includes(pattern)) {
        return platform;
      }
    }
    
    return 'generic';
  } catch (error) {
    console.error('Error detecting platform from URL:', error);
    return 'generic';
  }
}

/**
 * Fetches oEmbed metadata for a URL
 */
async function fetchOEmbedMetadata(url: string): Promise<OEmbedResponse | null> {
  try {
    // Try common oEmbed endpoints
    const oEmbedEndpoints = [
      `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`,
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
      `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    ];
    
    for (const endpoint of oEmbedEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Backtrack/1.0',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.title) {
            return data;
          }
        }
      } catch (error) {
        // Continue to next endpoint
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching oEmbed metadata:', error);
    return null;
  }
}

/**
 * Fetches basic metadata from a URL (fallback method)
 */
async function fetchBasicMetadata(url: string): Promise<Partial<UrlMetadata> | null> {
  try {
    // This is a simplified approach - in a real app you might want to use
    // a more sophisticated method or a service like LinkPreview API
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Backtrack/1.0',
      },
    });
    
    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      const title = response.headers.get('x-title') || '';
      
      return {
        title: title || new URL(url).hostname,
        description: contentType.includes('text/html') ? 'Web page' : undefined,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching basic metadata:', error);
    return null;
  }
}

/**
 * Extracts metadata from a URL using oEmbed and fallback methods
 */
export async function extractUrlMetadata(url: string): Promise<UrlMetadata> {
  const platform = detectPlatform(url);
  
  // Try oEmbed first
  const oEmbedData = await fetchOEmbedMetadata(url);
  if (oEmbedData) {
    return {
      title: oEmbedData.title || new URL(url).hostname,
      description: oEmbedData.author_name ? `by ${oEmbedData.author_name}` : undefined,
      thumbnail_url: oEmbedData.thumbnail_url,
      platform,
    };
  }
  
  // Fallback to basic metadata
  const basicData = await fetchBasicMetadata(url);
  if (basicData) {
    return {
      title: basicData.title || new URL(url).hostname,
      description: basicData.description,
      platform,
    };
  }
  
  // Final fallback - just use the URL
  return {
    title: new URL(url).hostname,
    platform,
  };
}

/**
 * Ingests a URL and creates an item in the database
 */
export async function ingestUrl(url: string): Promise<{ success: boolean; item?: any; error?: string }> {
  try {
    // Validate URL
    new URL(url);
    
    // Extract metadata
    const metadata = await extractUrlMetadata(url);
    
    // Create item data
    const itemData: CreateItemData = {
      title: metadata.title,
      description: metadata.description,
      content_url: url,
      thumbnail_url: metadata.thumbnail_url,
      source: 'url',
      platform: metadata.platform,
      ocr_done: true, // URLs don't need OCR
    };
    
    // Save to database
    const item = await ItemsRepository.create(itemData);
    
    return {
      success: true,
      item,
    };
  } catch (error) {
    console.error('Error ingesting URL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Validates if a URL is valid and supported
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Gets a user-friendly platform name
 */
export function getPlatformDisplayName(platform: Platform): string {
  switch (platform) {
    case 'youtube':
      return 'YouTube';
    case 'spotify':
      return 'Spotify';
    case 'instagram':
      return 'Instagram';
    case 'generic':
      return 'Web Link';
    default:
      return 'Unknown';
  }
}
