/**
 * YAML loader utilities for domain configuration
 */
import yaml from 'js-yaml';
import { DomainConfig } from '../types/DomainConfig';

/**
 * Load and parse a YAML domain configuration file
 */
export async function loadYamlConfig(filePath: string): Promise<DomainConfig> {
  try {
    console.log(`Attempting to load YAML config from: ${filePath}`);
    const response = await fetch(filePath);
    console.log(`Response status: ${response.status} ${response.statusText}`);
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      throw new Error(`Failed to load YAML config: ${response.status} ${response.statusText}. ${errorText}`);
    }
    const yamlText = await response.text();
    console.log(`YAML loaded, length: ${yamlText.length} characters`);
    const config = yaml.load(yamlText) as DomainConfig;
    console.log('YAML parsed successfully, validating...');
    return validateConfig(config);
  } catch (error) {
    console.error('Error loading YAML config:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

/**
 * Parse YAML string to DomainConfig
 */
export function parseYamlConfig(yamlText: string): DomainConfig {
  try {
    const config = yaml.load(yamlText) as DomainConfig;
    return validateConfig(config);
  } catch (error) {
    console.error('Error parsing YAML config:', error);
    throw error;
  }
}

/**
 * Validate domain configuration structure
 */
function validateConfig(config: any): DomainConfig {
  console.log('Validating config:', config);
  if (!config.metadata || !config.metadata.id || !config.metadata.name) {
    console.error('Config validation failed: missing metadata', config.metadata);
    throw new Error('Invalid config: missing required metadata (id, name)');
  }
  if (!config.ui || !config.ui.sections || !Array.isArray(config.ui.sections)) {
    console.error('Config validation failed: missing UI sections', config.ui);
    throw new Error('Invalid config: missing or invalid UI sections');
  }
  if (!config.api || !config.api.endpoints) {
    console.error('Config validation failed: missing API endpoints', config.api);
    throw new Error('Invalid config: missing API endpoints');
  }
  console.log('Config validation passed');
  return config as DomainConfig;
}

/**
 * Convert DomainConfig to YAML string
 */
export function configToYaml(config: DomainConfig): string {
  return yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  });
}

