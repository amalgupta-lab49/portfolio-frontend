/**
 * Utilities for DecisionTrace component
 * Converts domain workflow configuration to DecisionTrace format
 */
import { WorkflowConfig } from '../config/types/DomainConfig';

export interface FlowReference {
  version: string;
  updatedAt: string;
  stepsById: Record<string, any>;
  templates: any[];
  templatesById: Record<string, any>;
  defaultTemplateId: string;
}

const STEP_DESCRIBERS: Record<string, (entry: any) => string> = {
  external: () => 'External data sources accessed',
  internal: () => 'Internal data sources accessed',
  tooling: () => 'Tooling or API calls executed',
  agent: () => 'AI agent interactions',
  llm: () => 'LLM prompt/response exchanges',
  rag: () => 'RAG context enhancement',
  response: () => 'Final response generation',
};

const labelFromStepId = (stepId: string): string =>
  (stepId || '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const normalizeKey = (value: any): string =>
  typeof value === 'string'
    ? value
        .replace(/\s+/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase()
    : '';

export function convertWorkflowConfigToFlowReference(
  workflowConfig: WorkflowConfig | undefined
): FlowReference {
  if (!workflowConfig) {
    return createFallbackFlowReference();
  }

  const stepsArray = workflowConfig.steps || [];
  const stepsById: Record<string, any> = {};

  stepsArray.forEach((step) => {
    if (!step?.id) return;
    const describe = STEP_DESCRIBERS[step.id] || (() => step.summary || '');
    stepsById[step.id] = {
      id: step.id,
      label: step.label || labelFromStepId(step.id),
      color: step.color,
      icon: step.icon,
      describe,
    };
  });

  // Add default describers for any missing steps
  Object.keys(STEP_DESCRIBERS).forEach((stepId) => {
    if (!stepsById[stepId]) {
      stepsById[stepId] = {
        id: stepId,
        label: labelFromStepId(stepId),
        describe: STEP_DESCRIBERS[stepId],
      };
    } else if (!stepsById[stepId].describe) {
      stepsById[stepId].describe = STEP_DESCRIBERS[stepId];
    }
  });

  const defaultSequence =
    Array.isArray(workflowConfig.defaultSequence) && workflowConfig.defaultSequence.length
      ? workflowConfig.defaultSequence.filter((stepId) => stepsById[stepId])
      : Object.keys(stepsById);

  const templatesArray = workflowConfig.templates || [];
  const templates = templatesArray.map((template, index) => {
    const id = template?.id || normalizeKey(template?.label) || `template-${index}`;
    const sequence =
      Array.isArray(template?.sequence) && template.sequence.length
        ? template.sequence.filter((stepId) => stepsById[stepId])
        : defaultSequence;
    return {
      id,
      label: template?.label || labelFromStepId(id),
      description: template?.description || '',
      sections: Array.isArray(template?.sections) ? template.sections : [],
      sequence,
      fanIn: Array.isArray(template?.fanIn) ? template.fanIn : [],
      loopPatterns: Array.isArray(template?.loopPatterns) ? template.loopPatterns : [],
    };
  });

  // Ensure default template exists
  if (!templates.some((template) => template.id === 'default')) {
    templates.push({
      id: 'default',
      label: 'Default',
      description: 'Fallback decision trace sequence.',
      sections: [],
      sequence: defaultSequence,
      fanIn: [],
      loopPatterns: [],
    });
  }

  const templatesById = templates.reduce((acc, template) => {
    acc[template.id] = template;
    return acc;
  }, {} as Record<string, any>);

  return {
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    stepsById,
    templates,
    templatesById,
    defaultTemplateId: 'default',
  };
}

export function createFallbackFlowReference(): FlowReference {
  return convertWorkflowConfigToFlowReference({
    steps: [
      { id: 'external', label: 'External Sources' },
      { id: 'internal', label: 'Internal Sources' },
      { id: 'tooling', label: 'Tooling Call' },
      { id: 'agent', label: 'AI Agent Call' },
      { id: 'llm', label: 'LLM Interaction' },
      { id: 'rag', label: 'RAG (Context Enhancement)' },
      { id: 'response', label: 'Response Generation' },
    ],
    templates: [],
    defaultSequence: ['external', 'internal', 'tooling', 'agent', 'llm', 'rag', 'response'],
  });
}

export function getStepCategoriesFromWorkflow(workflowConfig: WorkflowConfig | undefined): Array<{
  id: string;
  icon: string;
  label: string;
  description: string;
}> {
  if (!workflowConfig?.steps) {
    return [
      {
        id: 'external',
        icon: '🌐',
        label: 'External Sources',
        description: 'External data sources',
      },
      {
        id: 'internal',
        icon: '🏢',
        label: 'Internal Sources',
        description: 'Internal data sources',
      },
      {
        id: 'tooling',
        icon: '🛠️',
        label: 'Tooling Call',
        description: 'Tooling invocations',
      },
      {
        id: 'agent',
        icon: '🤖',
        label: 'AI Agent Call',
        description: 'AI agent interactions',
      },
      {
        id: 'llm',
        icon: '🧠',
        label: 'LLM Interaction',
        description: 'LLM exchanges',
      },
      {
        id: 'rag',
        icon: '📚',
        label: 'RAG (Context Enhancement)',
        description: 'RAG context assembly',
      },
      {
        id: 'response',
        icon: '✍️',
        label: 'Response Generation',
        description: 'Response synthesis',
      },
    ];
  }

  const iconMap: Record<string, string> = {
    external: '🌐',
    internal: '🏢',
    tooling: '🛠️',
    agent: '🤖',
    llm: '🧠',
    rag: '📚',
    response: '✍️',
  };

  return workflowConfig.steps.map((step) => ({
    id: step.id,
    icon: step.icon || iconMap[step.id] || '⬚',
    label: step.label,
    description: step.summary || '',
  }));
}

