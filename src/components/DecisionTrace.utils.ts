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
        description: 'API – Market Intelligence, News, Blogs',
      },
      {
        id: 'internal',
        icon: '🏢',
        label: 'Internal Sources',
        description: 'API – Prop Research, Documents, SharePoint',
      },
      {
        id: 'tooling',
        icon: '🛠️',
        label: 'Tooling Call',
        description: 'Execution & analytics tooling invocations',
      },
      {
        id: 'agent',
        icon: '🤖',
        label: 'AI Agent Call',
        description: 'Autonomous agent workflow steps',
      },
      {
        id: 'llm',
        icon: '🧠',
        label: 'LLM Interaction',
        description: 'Direct conversational or prompt-driven calls',
      },
      {
        id: 'rag',
        icon: '📚',
        label: 'RAG (Context Enhancement)',
        description: 'Retrieval augmented context assembly',
      },
      {
        id: 'response',
        icon: '✍️',
        label: 'Response Generation',
        description: 'Narrative & output synthesis',
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

  // Map icon names to emojis (for YAML configs that use icon names)
  const iconNameToEmoji: Record<string, string> = {
    globe: '🌐',
    database: '🏢',
    wrench: '🛠️',
    tool: '🛠️',
    robot: '🤖',
    agent: '🤖',
    chat: '🧠',
    brain: '🧠',
    llm: '🧠',
    layers: '📚',
    book: '📚',
    rag: '📚',
    'check-circle': '✍️',
    check: '✍️',
    response: '✍️',
    write: '✍️',
  };

  return workflowConfig.steps.map((step) => {
    // If step.icon is already an emoji (contains non-ASCII), use it directly
    // Otherwise, try to map it from iconNameToEmoji, then iconMap, then fallback
    let icon = '⬚';
    if (step.icon) {
      // Check if it's already an emoji (contains characters outside ASCII)
      if (/[^\x00-\x7F]/.test(step.icon)) {
        icon = step.icon;
      } else {
        // It's an icon name, try to map it
        icon = iconNameToEmoji[step.icon.toLowerCase()] || iconMap[step.id] || '⬚';
      }
    } else {
      // No icon specified, use the default for this step type
      icon = iconMap[step.id] || '⬚';
    }

    return {
      id: step.id,
      icon,
      label: step.label,
      description: step.summary || '',
    };
  });
}

