/**
 * Generic API Client
 * Handles API calls with domain-specific endpoint mapping
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { APIConfig } from '../config/types/DomainConfig';

export class ApiClient {
  private client: AxiosInstance;
  private config: APIConfig;

  constructor(config: APIConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl || '',
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });
  }

  /**
   * Get endpoint URL by key
   */
  getEndpoint(key: string): string {
    return this.config.endpoints[key] || key;
  }

  /**
   * Make a GET request
   */
  async get<T = any>(endpointKey: string, config?: AxiosRequestConfig): Promise<T> {
    const endpoint = this.getEndpoint(endpointKey);
    const response = await this.client.get<T>(endpoint, config);
    return response.data;
  }

  /**
   * Make a POST request
   */
  async post<T = any>(
    endpointKey: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const endpoint = this.getEndpoint(endpointKey);
    const response = await this.client.post<T>(endpoint, data, config);
    return response.data;
  }

  /**
   * Make a PUT request
   */
  async put<T = any>(
    endpointKey: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const endpoint = this.getEndpoint(endpointKey);
    const response = await this.client.put<T>(endpoint, data, config);
    return response.data;
  }

  /**
   * Make a DELETE request
   */
  async delete<T = any>(endpointKey: string, config?: AxiosRequestConfig): Promise<T> {
    const endpoint = this.getEndpoint(endpointKey);
    const response = await this.client.delete<T>(endpoint, config);
    return response.data;
  }
}

