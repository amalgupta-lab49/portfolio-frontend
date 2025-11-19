/**
 * Type definitions for domain configuration
 * Defines the structure for multi-domain AI framework configuration
 */

export interface DomainMetadata {
  id: string;
  name: string;
  description: string;
  icon?: string;
  version?: string;
}

export interface UISection {
  id: string;
  label: string;
  component?: string;
  props?: Record<string, any>;
  visible?: boolean;
  order?: number;
}

export interface TabConfig {
  id: string;
  label: string;
  sections: string[];
  default?: boolean;
  icon?: string;
  special?: 'decisionTrace' | string; // Special tab types that render custom components
}

export interface UIConfig {
  sections: UISection[];
  tabs?: TabConfig[];
  layout?: 'grid' | 'list' | 'custom';
  theme?: string;
}

export interface DataModelField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  required?: boolean;
  description?: string;
  validation?: Record<string, any>;
}

export interface DataModel {
  name: string;
  fields: DataModelField[];
  description?: string;
}

export interface APIConfig {
  baseUrl?: string;
  endpoints: Record<string, string>;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface WorkflowStep {
  id: string;
  label: string;
  summary?: string;
  color?: string;
  icon?: string;
}

export interface LoopPattern {
  description: string;
  cycle: string[];
  maxIterations: number;
}

export interface FanIn {
  target: string;
  sources: string[];
}

export interface WorkflowTemplate {
  id: string;
  label: string;
  description?: string;
  sections?: string[];
  sequence: string[];
  fanIn?: FanIn[];
  loopPatterns?: LoopPattern[];
}

export interface WorkflowConfig {
  steps: WorkflowStep[];
  templates: WorkflowTemplate[];
  defaultSequence: string[];
}

export interface ComponentLayout {
  type: 'section' | 'panel' | 'card' | 'table' | 'chart' | 'custom';
  component?: string;
  props?: Record<string, any>;
  children?: ComponentLayout[];
}

export interface ThemeConfig {
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
    positive?: string;
    negative?: string;
  };
  fonts?: {
    primary?: string;
    secondary?: string;
  };
  spacing?: Record<string, string>;
  borderRadius?: Record<string, string>;
}

export interface DomainConfig {
  metadata: DomainMetadata;
  ui: UIConfig;
  dataModels?: DataModel[];
  api: APIConfig;
  workflow?: WorkflowConfig;
  layouts?: Record<string, ComponentLayout>;
  theme?: ThemeConfig;
}

export interface DomainRegistry {
  domains: Record<string, DomainConfig>;
  defaultDomain?: string;
}

