/**
 * Domain configuration loader
 * Handles loading and caching of domain configurations
 */
import { DomainConfig } from '../types/DomainConfig';
import { loadYamlConfig, parseYamlConfig } from './yamlLoader';

const domainCache: Map<string, DomainConfig> = new Map();

/**
 * Load domain configuration from YAML file
 */
export async function loadDomainConfig(domainId: string, configPath?: string): Promise<DomainConfig> {
  // Check cache first
  if (domainCache.has(domainId)) {
    return domainCache.get(domainId)!;
  }

  // Default path if not provided
  // Try public folder first (for static assets), then src folder
  const path = configPath || `/config/domains/${domainId}.yaml`;

  try {
    const config = await loadYamlConfig(path);
    domainCache.set(domainId, config);
    return config;
  } catch (error) {
    console.error(`Failed to load domain config for ${domainId}:`, error);
    throw error;
  }
}

/**
 * Load domain configuration from YAML string
 */
export function loadDomainConfigFromString(domainId: string, yamlString: string): DomainConfig {
  const config = parseYamlConfig(yamlString);
  domainCache.set(domainId, config);
  return config;
}

/**
 * Get cached domain configuration
 */
export function getCachedDomainConfig(domainId: string): DomainConfig | undefined {
  return domainCache.get(domainId);
}

/**
 * Clear domain configuration cache
 */
export function clearDomainCache(domainId?: string): void {
  if (domainId) {
    domainCache.delete(domainId);
  } else {
    domainCache.clear();
  }
}

/**
 * Preload multiple domain configurations
 */
export async function preloadDomains(domainIds: string[], basePath?: string): Promise<Record<string, DomainConfig>> {
  const results: Record<string, DomainConfig> = {};
  const loadPromises = domainIds.map(async (id) => {
    try {
      const config = await loadDomainConfig(id, basePath);
      results[id] = config;
    } catch (error) {
      console.error(`Failed to preload domain ${id}:`, error);
    }
  });
  await Promise.all(loadPromises);
  return results;
}

