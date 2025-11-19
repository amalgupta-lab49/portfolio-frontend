/**
 * Domain API Service
 * Service that uses domain config for API calls
 */
import React from 'react';
import { ApiClient } from './ApiClient';
import { useDomainConfig } from '../hooks/useDomainConfig';

let apiClientInstance: ApiClient | null = null;

/**
 * Get or create API client instance for current domain
 * Note: This function should be called within a React component that has domain context
 */
export function getDomainApiClient(): ApiClient {
  try {
    const domainConfig = useDomainConfig();
    if (!apiClientInstance || apiClientInstance['config'] !== domainConfig.api) {
      apiClientInstance = new ApiClient(domainConfig.api);
    }
    return apiClientInstance;
  } catch (error) {
    // Fallback if domain config not available
    return new ApiClient({
      baseUrl: '',
      endpoints: {},
    });
  }
}

/**
 * Hook to use domain API client
 */
export function useDomainApiClient(): ApiClient {
  const domainConfig = useDomainConfig();
  const [client] = React.useState(() => new ApiClient(domainConfig.api));
  return client;
}

