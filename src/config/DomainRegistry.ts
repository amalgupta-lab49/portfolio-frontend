/**
 * Domain Registry
 * Manages available domains and their configurations
 */
import { DomainConfig } from './types/DomainConfig';
import { loadDomainConfig, getCachedDomainConfig, clearDomainCache } from './utils/domainLoader';

export class DomainRegistry {
  private static instance: DomainRegistry;
  private domains: Map<string, DomainConfig> = new Map();
  private defaultDomainId?: string;

  private constructor() {}

  static getInstance(): DomainRegistry {
    if (!DomainRegistry.instance) {
      DomainRegistry.instance = new DomainRegistry();
    }
    return DomainRegistry.instance;
  }

  /**
   * Register a domain configuration
   */
  registerDomain(config: DomainConfig): void {
    this.domains.set(config.metadata.id, config);
  }

  /**
   * Load and register a domain from YAML file
   */
  async loadDomain(domainId: string, configPath?: string): Promise<DomainConfig> {
    console.log(`DomainRegistry: Loading domain ${domainId}`);
    const config = await loadDomainConfig(domainId, configPath);
    console.log(`DomainRegistry: Domain loaded, registering...`, config);
    this.registerDomain(config);
    console.log(`DomainRegistry: Domain registered. Total domains: ${this.domains.size}`);
    return config;
  }

  /**
   * Get domain configuration by ID
   */
  getDomain(domainId: string): DomainConfig | undefined {
    // Check registry first
    if (this.domains.has(domainId)) {
      return this.domains.get(domainId);
    }
    // Check cache
    return getCachedDomainConfig(domainId);
  }

  /**
   * Get all registered domain IDs
   */
  getDomainIds(): string[] {
    return Array.from(this.domains.keys());
  }

  /**
   * Check if domain is registered
   */
  hasDomain(domainId: string): boolean {
    return this.domains.has(domainId) || getCachedDomainConfig(domainId) !== undefined;
  }

  /**
   * Set default domain
   */
  setDefaultDomain(domainId: string): void {
    if (!this.hasDomain(domainId)) {
      throw new Error(`Domain ${domainId} is not registered`);
    }
    this.defaultDomainId = domainId;
  }

  /**
   * Get default domain ID
   */
  getDefaultDomainId(): string | undefined {
    return this.defaultDomainId;
  }

  /**
   * Clear domain from registry
   */
  clearDomain(domainId: string): void {
    this.domains.delete(domainId);
    clearDomainCache(domainId);
  }

  /**
   * Clear all domains
   */
  clearAll(): void {
    this.domains.clear();
    clearDomainCache();
  }
}

export const domainRegistry = DomainRegistry.getInstance();

