import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import './Dashboard.css';

const MAX_DRAFTS = 3;
const DB_NAME = 'decisionTraceDB';
const DB_VERSION = 1;
const DRAFT_STORE = 'drafts';

const formatTraceName = (date) => {
  const pad = (value, size = 2) => String(value).padStart(size, '0');
  const yy = String(date.getFullYear()).slice(-2);
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  const ms = pad(date.getMilliseconds(), 3);
  return `Trace-${yy}${mm}${dd}.${hh}${min}${ss}.${ms}`;
};

const formatTraceTime = (date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const generateSimplifiedTraceReport = (trace) => {
  const sections = [];
  const timestamp = trace.createdAt || trace.autosavedAt || new Date().toISOString();

  const headingLine = `${trace.label || 'Trace'} — Generated ${timestamp}`;
  const separator = '='.repeat(Math.max(headingLine.length, 60));

  sections.push(separator, headingLine, separator, '');

  const steps = trace.steps || [];

  const sourceSteps = steps.filter((step) =>
    ['external', 'internal'].includes(step.type)
  );
  if (sourceSteps.length > 0) {
    sections.push('Sources Invoked');
    sourceSteps.forEach((step) => {
      sections.push(
        `- ${step.label || 'Source'} (${step.type || 'source'})` +
          (step.timestamp ? ` @ ${step.timestamp}` : '')
      );
    });
    sections.push('');
  }

  if (steps.length > 0) {
    sections.push('Steps Taken');
    steps.forEach((step, index) => {
      const line = `${index + 1}. ${step.label || 'Step'} (${step.type || 'unknown'})` +
        (step.timestamp ? ` @ ${step.timestamp}` : '');
      sections.push(line);
    });
    sections.push('');
  }

  const responseStep =
    steps.find((step) => step.type === 'response' || step.type === 'response-generation') ||
    steps.find((step) => step.type === 'synthesis');

  if (responseStep) {
    sections.push('Response Generated');
    if (responseStep.description) {
      sections.push(responseStep.description, '');
    } else if (responseStep.output) {
      sections.push(responseStep.output, '');
    } else {
      sections.push('No response details captured.', '');
    }
  }

  const caveatSteps = steps.filter((step) =>
    ['tool', 'agent', 'rag'].includes(step.type)
  );
  if (caveatSteps.length > 0) {
    sections.push('Caveats / Alerts');
    caveatSteps.forEach((step) => {
      const line = `- ${step.label || step.type} ${(step.timestamp ? `(${step.timestamp})` : '')}`;
      sections.push(line);
    });
    sections.push('');
  }

  sections.push(separator);
  return sections.join('\n');
};

const openDraftsDB = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        db.createObjectStore(DRAFT_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

const readDraftsFromDB = async () => {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return [];
  }

  const db = await openDraftsDB();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, 'readonly');
    const store = tx.objectStore(DRAFT_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };

    tx.oncomplete = () => {
      db.close();
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };

    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
};

const writeDraftsToDB = async (drafts) => {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return;
  }

  const db = await openDraftsDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, 'readwrite');
    const store = tx.objectStore(DRAFT_STORE);

    const clearRequest = store.clear();
    clearRequest.onerror = () => {
      reject(clearRequest.error);
    };
    clearRequest.onsuccess = () => {
      drafts.forEach((draft) => {
        store.put(draft);
      });
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };

    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
};

const STEP_DESCRIBERS = {
  external: (entry) => {
    const sources = entry?.externalSources || entry?.sources?.external;
    if (Array.isArray(sources) && sources.length) {
      return `Referenced sources:\n- ${sources.join('\n- ')}`;
    }
    const prompt = entry?.prompt || entry?.context || '';
    if (prompt && /news|market|external/i.test(prompt)) {
      return 'External data referenced within the prompt.';
    }
    return 'No external sources captured for this trace.';
  },
  internal: (entry) => {
    const sources = entry?.internalSources || entry?.sources?.internal;
    if (Array.isArray(sources) && sources.length) {
      return `Internal references:\n- ${sources.join('\n- ')}`;
    }
    const prompt = entry?.prompt || '';
    if (prompt && /internal|research|proprietary/i.test(prompt)) {
      return 'Internal knowledge bases referenced within the prompt.';
    }
    return 'No internal sources captured for this trace.';
  },
  tooling: (entry) => {
    if (entry?.tool) {
      const inputs = entry.tool.inputs ? JSON.stringify(entry.tool.inputs, null, 2) : 'No inputs recorded.';
      return `${entry.tool.name || 'Tool Invocation'}\n${inputs}`;
    }
    if (entry?.kind === 'tool') {
      return entry.output || 'Tool execution logged without specific metadata.';
    }
    return 'No tooling call recorded for this trace.';
  },
  agent: (entry) => {
    if (entry?.kind === 'agent' || entry?.actor === 'AI Agent') {
      return entry.output || 'AI Agent handled the hand-off for this step.';
    }
    return 'No AI agent collaboration captured for this trace.';
  },
  llm: (entry) => {
    const prompt = entry?.prompt;
    if (prompt) {
      return prompt;
    }
    return 'No prompt captured for this trace.';
  },
  rag: (entry) => {
    if (entry?.ragContext) {
      return entry.ragContext;
    }
    if (entry?.kind === 'bullets' && Array.isArray(entry.bullets) && entry.bullets.length) {
      return entry.bullets.join('\n');
    }
    if (entry?.context) {
      return entry.context;
    }
    return 'No augmented context captured for this trace.';
  },
  response: (entry) => {
    if (entry?.output) {
      return entry.output;
    }
    if (entry?.summary) {
      return entry.summary;
    }
    return 'No response generation output captured.';
  }
};

const labelFromStepId = (stepId) =>
  (stepId || '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const normalizeKey = (value) =>
  typeof value === 'string'
    ? value
        .replace(/\s+/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase()
    : '';

const normalizeFlowReference = (data) => {
  const stepsArray = Array.isArray(data?.steps) ? data.steps : [];
  const stepsById = stepsArray.reduce((acc, step) => {
    if (!step?.id) {
      return acc;
    }
    const describe = STEP_DESCRIBERS[step.id] || (() => step.summary || '');
    acc[step.id] = {
      id: step.id,
      label: step.label || labelFromStepId(step.id),
      color: step.color,
      icon: step.icon,
      describe
    };
    return acc;
  }, {});

  Object.keys(STEP_DESCRIBERS).forEach((stepId) => {
    if (!stepsById[stepId]) {
      stepsById[stepId] = {
        id: stepId,
        label: labelFromStepId(stepId),
        describe: STEP_DESCRIBERS[stepId]
      };
    } else if (!stepsById[stepId].describe) {
      stepsById[stepId].describe = STEP_DESCRIBERS[stepId];
    }
  });

  const defaultSequence =
    Array.isArray(data?.defaultSequence) && data.defaultSequence.length
      ? data.defaultSequence.filter((stepId) => stepsById[stepId])
      : Object.keys(stepsById);

  const templatesArray = Array.isArray(data?.templates) ? data.templates : [];
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
      loopPatterns: Array.isArray(template?.loopPatterns) ? template.loopPatterns : []
    };
  });

  if (!templates.some((template) => template.id === 'default')) {
    templates.push({
      id: 'default',
      label: 'Default',
      description: 'Fallback decision trace sequence.',
      sections: [],
      sequence: defaultSequence,
      fanIn: [],
      loopPatterns: []
    });
  }

  const templatesById = templates.reduce((acc, template) => {
    acc[template.id] = template;
    return acc;
  }, {});

  return {
    version: data?.version || 'fallback',
    updatedAt: data?.updatedAt || new Date().toISOString(),
    stepsById,
    templates,
    templatesById,
    defaultTemplateId: 'default'
  };
};

const FALLBACK_FLOW_REFERENCE = normalizeFlowReference({
  steps: [
    { id: 'external', label: 'External Sources' },
    { id: 'internal', label: 'Internal Sources' },
    { id: 'tooling', label: 'Tooling Call' },
    { id: 'agent', label: 'AI Agent Call' },
    { id: 'llm', label: 'LLM Interaction' },
    { id: 'rag', label: 'RAG (Context Enhancement)' },
    { id: 'response', label: 'Response Generation' }
  ],
  templates: [
    {
      id: 'summaryGeneration',
      label: 'Summary Generation',
      sections: ['Morning Portfolio Briefing'],
      sequence: ['external', 'internal', 'rag', 'llm', 'response'],
      fanIn: [{ target: 'response', sources: ['rag', 'llm'] }],
      loopPatterns: []
    },
    {
      id: 'analytics',
      label: 'Analytics',
      sections: ['Risk Alerts', "Today's Actions", 'Performance Metrics'],
      sequence: ['external', 'internal', 'tooling', 'llm', 'rag', 'response'],
      fanIn: [{ target: 'response', sources: ['tooling', 'llm', 'rag'] }],
      loopPatterns: [
        { description: 'Tooling ⇄ Analysis refinement loop', cycle: ['tooling', 'llm', 'rag'], maxIterations: 3 }
      ]
    },
    {
      id: 'agenticAnalytics',
      label: 'Agentic Analytics',
      sections: ['Thesis Decay', 'Bias Sentinel'],
      sequence: ['external', 'internal', 'agent', 'tooling', 'llm', 'rag', 'response'],
      fanIn: [
        { target: 'rag', sources: ['external', 'internal', 'agent'] },
        { target: 'response', sources: ['tooling', 'llm', 'rag'] }
      ],
      loopPatterns: [
        { description: 'Agent delegates investigative tooling', cycle: ['agent', 'tooling', 'llm'], maxIterations: 4 },
        { description: 'LLM ↔ Context refinement', cycle: ['llm', 'rag'], maxIterations: 2 }
      ]
    }
  ],
  defaultSequence: ['external', 'internal', 'tooling', 'agent', 'llm', 'rag', 'response']
});

const truncateDescription = (text) => {
  if (!text) return '';
  const maxLength = 900;
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
};

const buildFlowFromTemplate = (
  entry,
  {
    canvasWidth,
    sequence,
    stepsById,
    fanIn = [],
    loopPatterns = []
  }
) => {
  const steps = [];
  const links = [];
  const baseTimestamp = formatTraceTime(new Date());
  const fallbackWidth = 1024;
  const effectiveCanvasWidth =
    typeof canvasWidth === 'number' && canvasWidth > 320 ? canvasWidth : fallbackWidth;
  const marginX = 160;
  const marginY = 140;
  const nodeWidth = 168;
  const horizontalSpacing = 140;
  const verticalSpacing = 200;
  const stepSpanX = nodeWidth + horizontalSpacing;
  const availableWidth = Math.max(effectiveCanvasWidth - marginX * 2, nodeWidth);
  const maxPerRow = Math.max(1, Math.floor(availableWidth / stepSpanX));
  const sanitizedSequence = Array.isArray(sequence) ? sequence.filter(Boolean) : [];
  const itemsPerRow = Math.max(1, Math.min(sanitizedSequence.length || 1, maxPerRow));

  let previousStepId = null;
  let previousStepKey = null;
  const nodeById = {};
  const linkKeySet = new Set();

  const createLinkRecord = (from, to) => ({
    id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from,
    to
  });

  sanitizedSequence.forEach((stepKey, index) => {
    const definition = stepsById?.[stepKey] || {
      id: stepKey,
      label: labelFromStepId(stepKey),
      describe: () => ''
    };
    const description = truncateDescription(definition.describe(entry));
    const stepId = `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const rowIndex = Math.floor(index / itemsPerRow);
    const rowStart = rowIndex * itemsPerRow;
    const columnsInRow = Math.min(itemsPerRow, sanitizedSequence.length - rowStart);
    const columnInRow = index - rowStart;
    const direction = rowIndex % 2 === 0 ? 1 : -1;
    const adjustedColumn =
      direction === 1 ? columnInRow : Math.max(0, columnsInRow - 1 - columnInRow);
    const x = marginX + adjustedColumn * stepSpanX;
    const y = marginY + rowIndex * verticalSpacing;

    steps.push({
      id: stepId,
      type: stepKey,
      label: definition.label,
      description,
      timestamp: baseTimestamp,
      owner: 'Audit Flow',
      position: { x, y }
    });
    nodeById[stepKey] = { stepId };

    if (previousStepId) {
      links.push(createLinkRecord(previousStepId, stepId));
      if (previousStepKey) {
        linkKeySet.add(`${previousStepKey}→${stepKey}`);
      }
    }

    previousStepId = stepId;
    previousStepKey = stepKey;
  });

  const addLinkRecord = (fromKey, toKey) => {
    const fromNode = nodeById[fromKey];
    const toNode = nodeById[toKey];
    if (!fromNode || !toNode) {
      return;
    }
    const linkKey = `${fromKey}→${toKey}`;
    if (linkKeySet.has(linkKey)) {
      return;
    }
    linkKeySet.add(linkKey);
    links.push(createLinkRecord(fromNode.stepId, toNode.stepId));
  };

  fanIn.forEach((group) => {
    if (!group || !group.target || !Array.isArray(group.sources)) {
      return;
    }
    group.sources.forEach((sourceKey) => {
      addLinkRecord(sourceKey, group.target);
    });
  });

  loopPatterns.forEach((loop) => {
    if (!loop || !Array.isArray(loop.cycle) || loop.cycle.length < 2) {
      return;
    }
    const cycle = loop.cycle.filter((stepKey) => nodeById[stepKey]);
    if (cycle.length < 2) {
      return;
    }
    for (let index = 0; index < cycle.length - 1; index += 1) {
      addLinkRecord(cycle[index], cycle[index + 1]);
    }
    addLinkRecord(cycle[cycle.length - 1], cycle[0]);
  });

  return { steps, links };
};

function DecisionTrace({ showChatbot, renderChatbot, auditTraceRequest, onAuditTraceConsumed }) {
  const stepCategories = [
    {
      id: 'external',
      icon: '🌐',
      label: 'External Sources',
      description: 'API – Market Intelligence, News, Blogs'
    },
    {
      id: 'internal',
      icon: '🏢',
      label: 'Internal Sources',
      description: 'API – Prop Research, Documents, SharePoint'
    },
    {
      id: 'tooling',
      icon: '🛠️',
      label: 'Tooling Call',
      description: 'Execution & analytics tooling invocations'
    },
    {
      id: 'agent',
      icon: '🤖',
      label: 'AI Agent Call',
      description: 'Autonomous agent workflow steps'
    },
    {
      id: 'llm',
      icon: '🧠',
      label: 'LLM Interaction',
      description: 'Direct conversational or prompt-driven calls'
    },
    {
      id: 'rag',
      icon: '📚',
      label: 'RAG (Context Enhancement)',
      description: 'Retrieval augmented context assembly'
    },
    {
      id: 'response',
      icon: '✍️',
      label: 'Response Generation',
      description: 'Narrative & output synthesis'
    }
  ];

  const [expandedCategories, setExpandedCategories] = useState(() =>
    stepCategories.reduce((acc, cat) => {
      acc[cat.id] = true;
      return acc;
    }, {})
  );
  const [isTraceTypesOpen, setIsTraceTypesOpen] = useState(true);
  const [isTraceExplorerOpen, setIsTraceExplorerOpen] = useState(true);
  const [traces, setTraces] = useState([]);
  const [activeTraceId, setActiveTraceId] = useState(null);
  const [traceContextMenu, setTraceContextMenu] = useState(null); // { id, x, y }
  const [selectedStepId, setSelectedStepId] = useState(null);
  const [nodeDimensions, setNodeDimensions] = useState({});
  const [draggingCategoryId, setDraggingCategoryId] = useState(null);
  const [isCanvasDragActive, setIsCanvasDragActive] = useState(false);
  const [draggingStepId, setDraggingStepId] = useState(null);
  const [flowReference, setFlowReference] = useState(FALLBACK_FLOW_REFERENCE);
  const [areDraftsLoaded, setAreDraftsLoaded] = useState(false);
  const [nodeContextMenu, setNodeContextMenu] = useState(null); // { stepId, x, y }
  const [nodePropertiesModal, setNodePropertiesModal] = useState(null); // { step }

  const canvasRef = useRef(null);
  const pendingCenteredTraceRef = useRef(null);
  const dragStateRef = useRef({ active: false, didMove: false, lastClientX: null, lastClientY: null });
  const nodeObserversRef = useRef(new Map());
  const nodeRefCallbacksRef = useRef(new Map());
  const draftsLoadedRef = useRef(false);
  const lastAuditRequestIdRef = useRef(null);
  const hasPersistedSessionRef = useRef(false);
  const flowReferenceRef = useRef(FALLBACK_FLOW_REFERENCE);
  const tracesRef = useRef([]);
  const pendingAuditRequestRef = useRef(null);

  useEffect(() => {
    tracesRef.current = traces;
  }, [traces]);

  useEffect(() => {
    let isCancelled = false;

    const loadFlowReference = async () => {
      try {
        const response = await fetch('/decision-trace-flow.json', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Unexpected status ${response.status}`);
        }
        const json = await response.json();
        const normalized = normalizeFlowReference(json);
        if (!isCancelled) {
          flowReferenceRef.current = normalized;
          setFlowReference(normalized);
        }
      } catch (error) {
        console.warn('Failed to load decision trace flow reference. Using fallback.', error);
      }
    };

    loadFlowReference();

    return () => {
      isCancelled = true;
    };
  }, []);

  const stepsById = flowReference?.stepsById || FALLBACK_FLOW_REFERENCE.stepsById;
  const templatesById = flowReference?.templatesById || FALLBACK_FLOW_REFERENCE.templatesById;
  const defaultTemplate =
    templatesById?.[flowReference?.defaultTemplateId] ||
    templatesById?.default ||
    FALLBACK_FLOW_REFERENCE.templatesById.default;

  const resolveTemplateForEntry = useCallback(
    ({ sectionLabel, entry }) => {
      const reference = flowReferenceRef.current || flowReference || FALLBACK_FLOW_REFERENCE;
      const templates = reference.templates || [];
      const referenceTemplatesById = reference.templatesById || {};
      const normalizedSection = normalizeKey(sectionLabel);
      const entryTitle = entry?.title || entry?.label || '';
      const normalizedTitle = normalizeKey(entryTitle);
      const normalizedKind = normalizeKey(entry?.kind);

      const matchBySection = templates.find(
        (template) =>
          Array.isArray(template.sections) &&
          template.sections.some((section) => normalizeKey(section) === normalizedSection)
      );
      if (matchBySection) {
        return matchBySection;
      }

      if (normalizedTitle) {
        const matchByTitle = templates.find(
          (template) =>
            Array.isArray(template.sections) &&
            template.sections.some((section) => normalizeKey(section) === normalizedTitle)
        );
        if (matchByTitle) {
          return matchByTitle;
        }
      }

      if (normalizedKind === 'agent' && referenceTemplatesById.agenticAnalytics) {
        return referenceTemplatesById.agenticAnalytics;
      }

      if (
        normalizedKind === 'tool' ||
        normalizedSection.includes('riskalerts') ||
        normalizedSection.includes('todaysactions') ||
        normalizedSection.includes('performancemetrics') ||
        normalizedTitle.includes('riskalerts') ||
        normalizedTitle.includes('performancemetrics')
      ) {
        if (referenceTemplatesById.analytics) {
          return referenceTemplatesById.analytics;
        }
      }

      if (
        referenceTemplatesById.summaryGeneration &&
        (normalizedSection.includes('briefing') ||
          normalizedTitle.includes('briefing') ||
          normalizedKind === 'text' ||
          normalizedKind === 'bullets')
      ) {
        return referenceTemplatesById.summaryGeneration;
      }

      return (
        referenceTemplatesById[reference.defaultTemplateId] ||
        referenceTemplatesById.default ||
        reference.templates[0] ||
        FALLBACK_FLOW_REFERENCE.templates[0]
      );
    },
    [flowReference]
  );

  const activeTrace = useMemo(() => traces.find((trace) => trace.id === activeTraceId) || null, [traces, activeTraceId]);

  const decisionTraceTimeline = useMemo(() => activeTrace?.steps || [], [activeTrace]);

  const sortedOpenTraces = useMemo(() => {
    return traces.slice(0, 12).map((trace) => ({
      id: trace.id,
      label: trace.label || 'Untitled'
    }));
  }, [traces]);

  const stepCategoryMap = useMemo(() => {
    return stepCategories.reduce((acc, category) => {
      acc[category.id] = category;
      return acc;
    }, {});
  }, [stepCategories]);

  const getNodeRefCallback = useCallback((stepId) => {
    if (nodeRefCallbacksRef.current.has(stepId)) {
      return nodeRefCallbacksRef.current.get(stepId);
    }

    const callback = (element) => {
      if (element) {
        const existing = nodeObserversRef.current.get(stepId);
        if (existing && existing.element === element) {
          return;
        }

        if (existing) {
          existing.observer.disconnect();
          nodeObserversRef.current.delete(stepId);
        }

        const updateSize = () => {
          const rect = element.getBoundingClientRect();
          const width = Math.max(1, Math.round(rect.width));
          const height = Math.max(1, Math.round(rect.height));
          setNodeDimensions((prev) => {
            const current = prev[stepId];
            if (current && current.width === width && current.height === height) {
              return prev;
            }
            return { ...prev, [stepId]: { width, height } };
          });
        };

        updateSize();

        if (typeof ResizeObserver !== 'undefined') {
          const observer = new ResizeObserver(() => {
            updateSize();
          });
          observer.observe(element);
          nodeObserversRef.current.set(stepId, { observer, element });
        }
      } else {
        const existing = nodeObserversRef.current.get(stepId);
        if (existing) {
          existing.observer.disconnect();
          nodeObserversRef.current.delete(stepId);
        }
        nodeRefCallbacksRef.current.delete(stepId);
      }
    };

    nodeRefCallbacksRef.current.set(stepId, callback);
    return callback;
  }, []);

const createTraceShell = (date = new Date()) => {
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  const timestamp = date.getTime();
  return {
    id: `trace-${timestamp}-${randomSuffix}`,
    label: formatTraceName(date),
    createdAt: date,
    timestamp: formatTraceTime(date),
    type: 'new',
    owner: 'You',
    steps: [],
    links: [],
    isDraft: false,
    baseTraceId: null,
    autosavedAt: null
  };
};

  const saveDraftsToIndexedDB = useCallback(
    async (tracesToPersist) => {
      if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
        return;
      }

      if (!tracesToPersist.length) {
        if (!hasPersistedSessionRef.current) {
          return;
        }
        await writeDraftsToDB([]);
        return;
      }

      const nowIso = new Date().toISOString();
      const clonedEntries = tracesToPersist.map((trace) => {
        const clone = {
          ...trace,
          steps: (trace.steps || []).map((step) => ({ ...step })),
          links: (trace.links || []).map((link) => ({ ...link })),
          autosavedAt: trace.autosavedAt || nowIso
        };

        if (clone.isDraft) {
          if (!clone.label || !clone.label.toLowerCase().endsWith('_draft')) {
            const baseName = clone.label ? clone.label.replace(/_draft$/i, '') : formatTraceName(new Date());
            clone.label = `${baseName}_draft`;
          }
        } else if (clone.label && clone.label.toLowerCase().endsWith('_draft')) {
          clone.label = clone.label.replace(/_draft$/i, '');
        }

        return clone;
      });

      const draftsOnly = clonedEntries
        .filter((entry) => entry.isDraft)
        .sort(
          (a, b) =>
            new Date(b.autosavedAt || b.createdAt || 0).getTime() -
            new Date(a.autosavedAt || a.createdAt || 0).getTime()
        )
        .slice(0, MAX_DRAFTS);

      const permanentEntries = clonedEntries.filter((entry) => !entry.isDraft);

      try {
        await writeDraftsToDB([...draftsOnly, ...permanentEntries]);
        hasPersistedSessionRef.current = true;
      } catch (error) {
        console.error('Failed to save decision trace drafts', error);
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      draftsLoadedRef.current = true;
      setAreDraftsLoaded(true);
      return;
    }

    let cancelled = false;

    const loadDrafts = async () => {
      try {
        const storedEntries = await readDraftsFromDB();
        if (!cancelled && Array.isArray(storedEntries) && storedEntries.length > 0) {
          const sortedEntries = [...storedEntries].sort(
            (a, b) =>
              new Date(b.autosavedAt || b.createdAt || 0).getTime() -
              new Date(a.autosavedAt || a.createdAt || 0).getTime()
          );

          if (!cancelled) {
            setTraces((prev) => {
              if (prev.length === 0) {
                return sortedEntries;
              }
              const existingIds = new Set(prev.map((trace) => trace.id));
              const entriesToAdd = sortedEntries.filter((entry) => !existingIds.has(entry.id));
              if (entriesToAdd.length === 0) {
                return prev;
              }
              return [...entriesToAdd, ...prev];
            });

            setActiveTraceId((currentId) => currentId || sortedEntries[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to load decision trace drafts', error);
      } finally {
        draftsLoadedRef.current = true;
        setAreDraftsLoaded(true);
      }
    };

    loadDrafts();

    return () => {
      cancelled = true;
    };
  }, []);

  const spawnNewTrace = useCallback(
    ({ sectionLabel, label, displayName, entry, templateOverride } = {}) => {
      const now = new Date();
      const baseName = formatTraceName(now);
      const timestampSuffix = baseName.replace(/^Trace-/, '');
      const cleanedLabel =
        label && typeof label === 'string' && label.trim().length
          ? label.trim().replace(/\s+/g, '')
          : sectionLabel && sectionLabel.trim().length
          ? sectionLabel.trim().replace(/\s+/g, '')
          : '';
      const traceLabel = cleanedLabel
        ? `${cleanedLabel}.${timestampSuffix}`
        : `${baseName}_draft`;

      const template =
        templateOverride ||
        (entry
          ? resolveTemplateForEntry({
              sectionLabel,
              entry
            })
          : defaultTemplate);

      const initialFlow =
        entry && template
          ? buildFlowFromTemplate(entry, {
              canvasWidth: canvasRef.current?.clientWidth,
              sequence: template.sequence,
              stepsById,
              fanIn: template.fanIn,
              loopPatterns: template.loopPatterns
            })
          : { steps: [], links: [] };

      const newTrace = {
        ...createTraceShell(now),
        label: traceLabel,
        displayName: displayName || traceLabel,
        isDraft: true,
        baseTraceId: null,
        templateId: template?.id || null,
        steps: initialFlow.steps,
        links: initialFlow.links
      };

      setTraces((prev) => {
        const nextTraces = [newTrace, ...prev];
        tracesRef.current = nextTraces;
        saveDraftsToIndexedDB(nextTraces).catch((error) =>
          console.error('Failed to save new draft trace', error)
        );
        return nextTraces;
      });
      setActiveTraceId(newTrace.id);
      setIsTraceExplorerOpen(true);
      return newTrace;
    },
    [
      defaultTemplate,
      resolveTemplateForEntry,
      stepsById,
      saveDraftsToIndexedDB
    ]
  );

  const handleNewTrace = useCallback(
    (options = {}) => {
      return spawnNewTrace(options);
    },
    [spawnNewTrace]
  );

  const processAuditRequest = useCallback(
    (request) => {
      if (!request) {
        return;
      }

      const template = resolveTemplateForEntry({
        sectionLabel: request.section,
        entry: request.entry
      });
      handleNewTrace({
        sectionLabel: request.section,
        label: request.label,
        displayName: request.displayName,
        entry: request.entry,
        templateOverride: template
      });
      lastAuditRequestIdRef.current = request.id;
      if (onAuditTraceConsumed) {
        onAuditTraceConsumed();
      }
    },
    [resolveTemplateForEntry, handleNewTrace, onAuditTraceConsumed]
  );

  useEffect(() => {
    if (!auditTraceRequest || auditTraceRequest.id === lastAuditRequestIdRef.current) {
      return;
    }

    if (!areDraftsLoaded) {
      pendingAuditRequestRef.current = auditTraceRequest;
      return;
    }

    pendingAuditRequestRef.current = null;
    processAuditRequest(auditTraceRequest);
  }, [auditTraceRequest, areDraftsLoaded, processAuditRequest]);

  useEffect(() => {
    if (!areDraftsLoaded) {
      return;
    }

    if (pendingAuditRequestRef.current) {
      const request = pendingAuditRequestRef.current;
      pendingAuditRequestRef.current = null;
      processAuditRequest(request);
    }
  }, [areDraftsLoaded, processAuditRequest]);

  const commitTraceRename = useCallback(
    (trace, proposedLabel, { forcePermanent = false } = {}) => {
      if (!trace) {
        return null;
      }
      const trimmed = (proposedLabel || '').trim();
      if (!trimmed) {
        return null;
      }

      const now = new Date();
      const nowIso = now.toISOString();
      const shouldFinalize =
        forcePermanent ||
        trace.isDraft ||
        (typeof trace.id === 'string' && trace.id.startsWith('draft-'));

      const newId = shouldFinalize
        ? `trace-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`
        : trace.id;

      let updatedTraceSnapshot = null;
      let updatedArraySnapshot = null;

      setTraces((prev) => {
        let changed = false;
        const updated = prev.map((item) => {
          if (item.id !== trace.id) {
            return item;
          }
          changed = true;
          const next = {
            ...item,
            id: newId,
            label: trimmed,
            isDraft: shouldFinalize ? false : item.isDraft,
            baseTraceId: shouldFinalize ? null : item.baseTraceId,
            autosavedAt: nowIso
          };
          updatedTraceSnapshot = next;
          return next;
        });

        if (!changed) {
          updatedTraceSnapshot = null;
          return prev;
        }

        updatedArraySnapshot = updated;
        return updated;
      });

      if (!updatedTraceSnapshot || !updatedArraySnapshot) {
        return null;
      }

      if (updatedTraceSnapshot.id !== trace.id) {
        setActiveTraceId((prev) => (prev === trace.id ? updatedTraceSnapshot.id : prev));
      }

      const persistable = updatedArraySnapshot.filter(
        (item) => (item.steps || []).length > 0 || item.isDraft
      );

      saveDraftsToIndexedDB(persistable).catch((error) =>
        console.error('Failed to persist renamed trace', error)
      );

      return updatedTraceSnapshot.id;
    },
    [saveDraftsToIndexedDB]
  );

  const handleSelectTrace = (traceId) => {
    setActiveTraceId(traceId);
    setSelectedStepId(null);
    setTraceContextMenu(null);
  };

  const confirmAndDeleteTrace = (traceId) => {
    const traceToDelete = traces.find((trace) => trace.id === traceId);

    const message = traceToDelete
      ? `The trace "${traceToDelete.label || 'Unnamed Trace'}" will be deleted. Are you sure?`
      : 'The trace will be deleted. Are you sure?';

    const confirmed = window.confirm(message);
    if (!confirmed) {
      return;
    }

    setTraces((prev) => {
      const updated = prev.filter((trace) => trace.id !== traceId);
      tracesRef.current = updated;
      saveDraftsToIndexedDB(updated).catch((error) =>
        console.error('Failed to persist traces after deletion', error)
      );
      return updated;
    });
    if (activeTraceId === traceId) {
      setActiveTraceId(null);
      setSelectedStepId(null);
    }
    if (traceToDelete?.steps?.length) {
      setNodeDimensions((prev) => {
        const next = { ...prev };
        traceToDelete.steps.forEach((step) => {
          delete next[step.id];
        });
        return next;
      });
    }
    setTraceContextMenu(null);
  };

  const handleRenameTrace = (traceId) => {
    const trace = traces.find((t) => t.id === traceId);
    if (!trace) return;
    const defaultName =
      trace.label && trace.label.toLowerCase().endsWith('_draft')
        ? trace.label.replace(/_draft$/i, '')
        : trace.label || formatTraceName(new Date());
    const newLabel = window.prompt('Rename trace', defaultName);
    if (newLabel && newLabel.trim()) {
      commitTraceRename(trace, newLabel, { forcePermanent: trace.isDraft });
    }
    setTraceContextMenu(null);
  };

  const handleExportTrace = (traceId, mode = 'detailed') => {
    const trace = traces.find((t) => t.id === traceId);
    if (!trace) return;

    const exportPayload =
      mode === 'simplified'
        ? generateSimplifiedTraceReport(trace)
        : JSON.stringify(trace, null, 2);

    const fileName =
      mode === 'simplified'
        ? `${trace.label || 'trace'}-simplified.txt`
        : `${trace.label || 'trace'}.json`;

    const mimeType = mode === 'simplified' ? 'text/plain;charset=utf-8' : 'application/json';
    const blob = new Blob([exportPayload], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setTraceContextMenu(null);
  };

  // Placeholder timeline data; real data should be supplied via props/API
  const stepsByCategory = useMemo(() => {
    return stepCategories.reduce((acc, cat) => {
      acc[cat.id] = decisionTraceTimeline.filter((step) => step.type === cat.id);
      return acc;
    }, {});
  }, [decisionTraceTimeline, stepCategories]);

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const handleToggleCategory = (categoryId) => {
    if (draggingCategoryId) {
      return;
    }
    toggleCategory(categoryId);
  };

  const handleCategoryDragStart = (event, category) => {
    const payload = JSON.stringify({ type: 'step-category', categoryId: category.id });
    event.dataTransfer.setData('application/json', payload);
    event.dataTransfer.setData('text/plain', category.label);
    event.dataTransfer.effectAllowed = 'copyMove';
    setDraggingCategoryId(category.id);
  };

  const handleCategoryDragEnd = () => {
    setDraggingCategoryId(null);
    setIsCanvasDragActive(false);
  };

  const isCategoryDragEvent = (event) => {
    if (draggingCategoryId) {
      return true;
    }
    const types = Array.from(event.dataTransfer?.types || []);
    return types.includes('application/json') || types.includes('text/plain');
  };

  const getCategoryFromDragEvent = (event) => {
    const jsonPayload = event.dataTransfer?.getData('application/json');
    if (jsonPayload) {
      try {
        const parsed = JSON.parse(jsonPayload);
        if (parsed?.type === 'step-category') {
          const match = stepCategories.find((cat) => cat.id === parsed.categoryId);
          if (match) {
            return match;
          }
        }
      } catch (_error) {
        // ignore parse errors
      }
    }

    if (draggingCategoryId) {
      const match = stepCategories.find((cat) => cat.id === draggingCategoryId);
      if (match) {
        return match;
      }
    }

    const labelPayload = event.dataTransfer?.getData('text/plain');
    if (labelPayload) {
      const match = stepCategories.find((cat) => cat.label === labelPayload);
      if (match) {
        return match;
      }
    }

    return null;
  };

  const handleCanvasDragOver = (event) => {
    if (!isCategoryDragEvent(event)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleCanvasDragEnter = (event) => {
    if (!isCategoryDragEvent(event)) {
      return;
    }
    event.preventDefault();

    if (!activeTraceId && !pendingCenteredTraceRef.current) {
      const created = handleNewTrace();
      pendingCenteredTraceRef.current = created.id;
    }

    setIsCanvasDragActive(true);
  };

  const handleCanvasDragLeave = (event) => {
    if (!isCategoryDragEvent(event)) {
      return;
    }

    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsCanvasDragActive(false);
    }
  };

  const clampPosition = (value, min, max) => Math.max(min, Math.min(max, value));

  const handleCanvasDrop = (event) => {
    event.preventDefault();
    setIsCanvasDragActive(false);

    if (!isCategoryDragEvent(event)) {
      return;
    }

    const category = getCategoryFromDragEvent(event);
    if (!category) {
      return;
    }

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    let dropX = canvasRect ? event.clientX - canvasRect.left : 0;
    let dropY = canvasRect ? event.clientY - canvasRect.top : 0;

    let targetTraceId = activeTraceId || pendingCenteredTraceRef.current;
    let createdTrace = null;
    let createdStepId = null;

    if (!targetTraceId) {
      createdTrace = handleNewTrace();
      targetTraceId = createdTrace.id;
      pendingCenteredTraceRef.current = targetTraceId;
    }

    setTraces((prev) => {
      const workingTraces = [...prev];
      const shouldCenter = pendingCenteredTraceRef.current === targetTraceId;

      if (shouldCenter && canvasRect) {
        dropX = canvasRect.width / 2;
        dropY = canvasRect.height / 2;
      }

      if (canvasRect) {
        dropX = clampPosition(dropX, 40, canvasRect.width - 40);
        dropY = clampPosition(dropY, 40, canvasRect.height - 40);
      }

      const time = new Date();
      const newStep = {
        id: `step-${time.getTime()}`,
        type: category.id,
        label: category.label,
        icon: category.icon,
        description: category.description,
        timestamp: formatTraceTime(time),
        owner: 'You',
        position: { x: dropX, y: dropY }
      };
      createdStepId = newStep.id;

      const nextTraces = workingTraces.map((trace) => {
        if (trace.id !== targetTraceId) {
          return trace;
        }
        const updatedSteps = [...(trace.steps || []), newStep];
        return { ...trace, steps: updatedSteps, links: trace.links || [] };
      });

      tracesRef.current = nextTraces;

      if (createdTrace) {
        setActiveTraceId(createdTrace.id);
      }

      saveDraftsToIndexedDB(nextTraces).catch((error) =>
        console.error('Failed to persist trace after drop', error)
      );

      return nextTraces;
    });

    pendingCenteredTraceRef.current = null;
    if (createdStepId) {
      setSelectedStepId(createdStepId);
    }
  };

  const handleNodeContextMenu = useCallback(
    (event, step) => {
      event.preventDefault();
      event.stopPropagation();
      setSelectedStepId(step.id);
      setTraceContextMenu(null);
      setNodeContextMenu({
        stepId: step.id,
        x: event.clientX,
        y: event.clientY
      });
    },
    []
  );

  const closeNodePropertiesModal = useCallback(() => {
    setNodePropertiesModal(null);
  }, []);

  const handlePropertiesFieldChange = useCallback((field, value) => {
    setNodePropertiesModal((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        draft: {
          ...(prev.draft || {}),
          [field]: value
        }
      };
    });
  }, []);

  const handlePropertiesTableChange = useCallback(
    (rowId, updates) => {
      setNodePropertiesModal((prev) => {
        if (!prev) {
          return prev;
        }
        const table = Array.isArray(prev.draft?.table) ? prev.draft.table : [];
        const updatedTable = table.map((row) =>
          row.id === rowId
            ? {
                ...row,
                ...updates
              }
            : row
        );
        return {
          ...prev,
          draft: {
            ...(prev.draft || {}),
            table: updatedTable
          }
        };
      });
    },
    []
  );
  const handleSaveNodeProperties = useCallback(() => {
    if (!nodePropertiesModal || !nodePropertiesModal.step) {
      return;
    }
    const { step, draft } = nodePropertiesModal;
    const nextTable = Array.isArray(draft?.table) ? draft.table : [];
    setTraces((prev) =>
      prev.map((trace) => {
        if (trace.id !== activeTraceId) {
          return trace;
        }
        const updatedSteps = (trace.steps || []).map((existingStep) => {
          if (existingStep.id !== step.id) {
            return existingStep;
          }
          return {
            ...existingStep,
            propertiesTable: nextTable.map((row) => ({
              id: row.id || `row-${Date.now()}`,
              key: row.key || '',
              value: row.value || ''
            }))
          };
        });
        const updatedTrace = {
          ...trace,
          steps: updatedSteps
        };
        return updatedTrace;
      })
    );
    saveDraftsToIndexedDB(tracesRef.current).catch((error) =>
      console.error('Failed to persist trace after properties update', error)
    );
    setTraces((prev) =>
      prev.map((trace) => {
        if (trace.id !== activeTraceId) {
          return trace;
        }
        const updatedSteps = (trace.steps || []).map((existingStep) => {
          if (existingStep.id !== nodePropertiesModal.step.id) {
            return existingStep;
          }
          return {
            ...existingStep,
            propertiesTable: nextTable.map((row) => ({
              id: row.id || `row-${Date.now()}`,
              key: row.key || '',
              value: row.value || ''
            }))
          };
        });
        const updatedTrace = {
          ...trace,
          steps: updatedSteps
        };
        return updatedTrace;
      })
    );
    saveDraftsToIndexedDB(tracesRef.current).catch((error) =>
      console.error('Failed to persist trace after properties update', error)
    );
    closeNodePropertiesModal();
  }, [nodePropertiesModal, activeTraceId, saveDraftsToIndexedDB, closeNodePropertiesModal]);
  const handleDeletePropertiesRow = useCallback((rowId) => {
    setNodePropertiesModal((prev) => {
      if (!prev) {
        return prev;
      }
      const table = Array.isArray(prev.draft?.table) ? prev.draft.table : [];
      const updatedTable = table.filter((row) => row.id !== rowId);
      return {
        ...prev,
        draft: {
          ...(prev.draft || {}),
          table: updatedTable,
          editingValue:
            prev.draft?.editingValue?.rowId === rowId ? null : prev.draft?.editingValue || null
        }
      };
    });
  }, []);

  const getPropertiesOptionsForStep = useCallback((stepType) => {
    switch (stepType) {
      case 'internal':
        return [
          'Rest Endpoint',
          'GQL Endpoint',
          'Kafka Consumer',
          'S3',
          'Sharepoint',
          'AEM',
          'NAS',
          'File System'
        ];
      case 'external':
        return [
          'Bloomberg',
          'Alpha Vantage',
          'Polygon',
          'Yahoo Finance',
          'Alladin'
        ];
      case 'agent':
        return [
          'Internal Agent',
          'ChatGPT Agent',
          'Warp',
          'Cursor',
          'Copilot',
          'Claude Code',
          'Codex'
        ];
      case 'tooling':
        return ['API Endpoint'];
      case 'llm':
        return [
          'ChatGPT',
          'Claude',
          'Grok',
          'Deepseek',
          'Gemini',
          'Federated Model Internal Call'
        ];
      default:
        return [];
    }
  }, []);

  const handleOpenNodeProperties = useCallback(
    (stepId) => {
      const step =
        decisionTraceTimeline.find((item) => item.id === stepId) ||
        (activeTrace?.steps || []).find((item) => item.id === stepId);
      if (!step) {
        setNodeContextMenu(null);
        return;
      }
      const existingTable = Array.isArray(step.propertiesTable)
        ? step.propertiesTable
        : [];
      const draftTable = existingTable.length
        ? existingTable.map((row, index) => ({
            id: row.id || `row-${index}-${Date.now()}`,
            key: row.key || `Property ${index + 1}`,
            value: row.value || '',
            source: row.source || ''
          }))
        : [
            {
              id: `row-${Date.now()}`,
              key: 'Description',
              value:
                step.description ||
                step.summary ||
                step.prompt ||
                (Array.isArray(step.bullets) ? step.bullets.join(', ') : '') ||
                '',
              source: step.owner || 'System'
            }
          ];
      setNodePropertiesModal({
        step,
        draft: {
          table: draftTable,
          options: getPropertiesOptionsForStep(step.type),
          editingValue: null
        }
      });
      setNodeContextMenu(null);
    },
    [decisionTraceTimeline, activeTrace, getPropertiesOptionsForStep]
  );

  useEffect(() => {
    setSelectedStepId(null);
  }, [activeTraceId]);

  const renderedContextMenu = useMemo(() => {
    if (!traceContextMenu) {
      return null;
    }

    return ReactDOM.createPortal(
      <div
        className={`trace-context-menu ${traceContextMenu.mode === 'export' ? 'export-menu' : ''}`}
        style={{ left: `${traceContextMenu.x}px`, top: `${traceContextMenu.y}px` }}
      >
        {traceContextMenu.mode === 'export' ? (
          <>
            <button
              className="trace-context-item"
              onClick={() => handleExportTrace(traceContextMenu.id, 'simplified')}
            >
              Simplified
            </button>
            <button
              className="trace-context-item"
              onClick={() => handleExportTrace(traceContextMenu.id, 'detailed')}
            >
              Detailed
            </button>
          </>
        ) : (
          <>
            <button
              className="trace-context-item"
              onClick={() => confirmAndDeleteTrace(traceContextMenu.id)}
            >
              Delete
            </button>
            <button
              className="trace-context-item"
              onClick={() => handleRenameTrace(traceContextMenu.id)}
            >
              Rename
            </button>
            <button
              className="trace-context-item"
              onClick={() => handleExportTrace(traceContextMenu.id)}
            >
              Export
            </button>
          </>
        )}
      </div>,
      document.body
    );
  }, [traceContextMenu, confirmAndDeleteTrace, handleRenameTrace, handleExportTrace]);

  const getTraceDisplayName = useCallback(
    (trace) => {
      if (!trace) {
        return 'Untitled Trace';
      }
      const raw = trace.displayName || trace.fullName || trace.label || 'Untitled Trace';
      if (typeof raw !== 'string') {
        return 'Untitled Trace';
      }
      return raw.replace(/_draft$/i, '');
    },
    []
  );

  const renderedNodeContextMenu = useMemo(() => {
    if (!nodeContextMenu) {
      return null;
    }

    return ReactDOM.createPortal(
      <div
        className="trace-context-menu trace-node-context-menu"
        style={{ left: `${nodeContextMenu.x}px`, top: `${nodeContextMenu.y}px` }}
      >
        <button
          className="trace-context-item"
          onClick={() => handleOpenNodeProperties(nodeContextMenu.stepId)}
        >
          Properties
        </button>
      </div>,
      document.body
    );
  }, [nodeContextMenu, handleOpenNodeProperties]);

  const renderedNodePropertiesModal = useMemo(() => {
    if (!nodePropertiesModal) {
      return null;
    }

    const { step, draft } = nodePropertiesModal;
    const tableRows = Array.isArray(draft?.table) ? draft.table : [];
    const categoryMeta = stepCategoryMap[step.type] || {};
    const title = step.label || categoryMeta.label || 'Step Properties';

    return ReactDOM.createPortal(
      <div
        className="trace-node-properties-backdrop"
        onClick={closeNodePropertiesModal}
        role="presentation"
      >
        <div
          className="trace-node-properties-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`trace-node-properties-title-${step.id}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="trace-node-properties-header">
            <h3 id={`trace-node-properties-title-${step.id}`}>{title}</h3>
            <button
              type="button"
              className="trace-node-properties-close"
              onClick={closeNodePropertiesModal}
              aria-label="Close properties"
            >
              ×
            </button>
          </div>
          <div className="trace-node-properties-body">
            <div className="trace-node-properties-table">
              <div className="trace-node-properties-table-head">
                <span className="trace-node-properties-table-title">Existing Properties</span>
            <button
              type="button"
              className="trace-node-properties-add"
              onClick={() =>
                setNodePropertiesModal((prev) => {
                  if (!prev) return prev;
                  const nextTable = Array.isArray(prev.draft?.table)
                    ? prev.draft.table.slice()
                    : [];
                  nextTable.push({
                    id: `row-${Date.now()}`,
                    key: '',
                    value: '',
                    source: '',
                    isNew: true
                  });
                  handlePropertiesFieldChange('editingValue', {
                    rowId: (nextTable[nextTable.length - 1] || {}).id,
                    field: 'key',
                    mode: 'select'
                  });
                  return {
                    ...prev,
                    draft: {
                      ...(prev.draft || {}),
                      table: nextTable,
                      editingValue: {
                        rowId: (nextTable[nextTable.length - 1] || {}).id,
                        field: 'key',
                        mode: 'select'
                      }
                    }
                  };
                })
              }
            >
              + Add Row
            </button>
              </div>
            <table className="trace-node-properties-grid">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.length === 0 ? (
                    <tr>
                    <td colSpan={2} className="empty">
                        No properties recorded for this step yet.
                      </td>
                    </tr>
                  ) : (
                tableRows.map((row, index) => {
                  const isEditableValue =
                    nodePropertiesModal?.draft?.editingValue?.rowId === row.id &&
                    nodePropertiesModal?.draft?.editingValue?.field === 'value';
                  const isEditableKey =
                    nodePropertiesModal?.draft?.editingValue?.rowId === row.id &&
                    nodePropertiesModal?.draft?.editingValue?.field === 'key';

                  return (
                    <tr key={row.id || index}>
                      <td data-label="Property">
                        {isEditableKey ? (
                          <select
                            autoFocus
                            className="trace-node-properties-select"
                            value={row.key || ''}
                            onChange={(event) => {
                              handlePropertiesTableChange(row.id, { key: event.target.value });
                              handlePropertiesFieldChange('editingValue', {
                                rowId: row.id,
                                field: 'value',
                                mode: 'input'
                              });
                            }}
                            onBlur={() => {
                              handlePropertiesFieldChange('editingValue', null);
                            }}
                          >
                            <option value="" disabled>
                              Select property
                            </option>
                            {(nodePropertiesModal?.draft?.options || []).map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            type="button"
                            className="trace-node-properties-cell-button"
                            onClick={() =>
                              handlePropertiesFieldChange('editingValue', {
                                rowId: row.id,
                                field: 'key',
                                mode: 'select'
                              })
                            }
                          >
                            {row.key || `Property ${index + 1}`}
                          </button>
                        )}
                      </td>
                      <td data-label="Value" className="trace-node-properties-value-cell">
                        {isEditableValue ? (
                          <input
                            autoFocus
                            className="trace-node-properties-input"
                            value={row.value || ''}
                            onChange={(event) =>
                              handlePropertiesTableChange(row.id, { value: event.target.value })
                            }
                            onBlur={() => handlePropertiesFieldChange('editingValue', null)}
                          />
                        ) : (
                          <button
                            type="button"
                            className="trace-node-properties-cell-button"
                            onClick={() =>
                              handlePropertiesFieldChange('editingValue', {
                                rowId: row.id,
                                field: 'value',
                                mode: 'input'
                              })
                            }
                          >
                            {row.value && row.value.trim().length ? row.value : '—'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="trace-node-properties-delete-row"
                          onClick={() => handleDeletePropertiesRow(row.id)}
                          aria-label={`Delete ${row.key || `row ${index + 1}`}`}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        <div className="trace-node-properties-footer">
          <button
            type="button"
            className="trace-node-properties-save"
            onClick={handleSaveNodeProperties}
          >
            Save
          </button>
        </div>
        </div>
      </div>,
      document.body
    );
  }, [
    nodePropertiesModal,
    stepCategoryMap,
    closeNodePropertiesModal,
    handlePropertiesTableChange,
    handlePropertiesFieldChange,
    handleDeletePropertiesRow,
    handleSaveNodeProperties
  ]);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof indexedDB === 'undefined' ||
      !areDraftsLoaded
    ) {
      return;
    }

    let cancelled = false;

    const persistDrafts = async () => {
      try {
        if (cancelled) {
          return;
        }

        const snapshot = tracesRef.current;
        if (!snapshot.length) {
          if (!hasPersistedSessionRef.current) {
            return;
          }
          await writeDraftsToDB([]);
          hasPersistedSessionRef.current = false;
          return;
        }

        await saveDraftsToIndexedDB(snapshot);
        hasPersistedSessionRef.current = true;
      } catch (error) {
        console.error('Failed to persist decision trace drafts', error);
      }
    };

    persistDrafts();

    return () => {
      cancelled = true;
    };
  }, [traces, saveDraftsToIndexedDB, areDraftsLoaded]);

  useEffect(() => {
    const validIds = new Set(decisionTraceTimeline.map((step) => step.id));
    setNodeDimensions((prev) => {
      let changed = false;
      const next = {};
      Object.keys(prev).forEach((key) => {
        if (validIds.has(key)) {
          next[key] = prev[key];
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [decisionTraceTimeline]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      const state = dragStateRef.current;
      if (!state.active || !canvasRef.current) {
        return;
      }

      state.lastClientX = event.clientX;
      state.lastClientY = event.clientY;

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const rawX = event.clientX - canvasRect.left - state.offsetX;
      const rawY = event.clientY - canvasRect.top - state.offsetY;

      const nextX = clampPosition(rawX, 40, canvasRect.width - 40);
      const nextY = clampPosition(rawY, 40, canvasRect.height - 40);

      if (!state.didMove) {
        const deltaX = Math.abs(nextX - state.originX);
        const deltaY = Math.abs(nextY - state.originY);
        if (deltaX > 2 || deltaY > 2) {
          state.didMove = true;
        }
      }

      setTraces((prev) =>
        prev.map((trace) => {
          if (trace.id !== state.traceId) {
            return trace;
          }
          const updatedSteps = (trace.steps || []).map((step) =>
            step.id === state.stepId
              ? {
                  ...step,
                  position: {
                    x: nextX,
                    y: nextY
                  }
                }
              : step
          );
          return { ...trace, steps: updatedSteps, links: trace.links || [] };
        })
      );
    };

    const handleMouseUp = () => {
      const state = dragStateRef.current;
      if (!state.active) {
        return;
      }

      let linkCreated = false;

      if (
        state.didMove &&
        state.lastClientX !== null &&
        state.lastClientY !== null &&
        typeof document !== 'undefined'
      ) {
        const elements = document.elementsFromPoint(state.lastClientX, state.lastClientY) || [];
        const targetElement = elements.find(
          (element) =>
            element instanceof HTMLElement &&
            element.classList.contains('trace-node-instance') &&
            element.dataset.stepId &&
            element.dataset.stepId !== state.stepId
        );

        if (targetElement?.dataset?.stepId) {
          const targetId = targetElement.dataset.stepId;
          linkCreated = true;

          setTraces((prev) =>
            prev.map((trace) => {
              if (trace.id !== state.traceId) {
                return trace;
              }

              const existingLinks = trace.links || [];
              const linkExists = existingLinks.some(
                (link) => link.from === state.stepId && link.to === targetId
              );

              const updatedSteps = (trace.steps || []).map((step) =>
                step.id === state.stepId
                  ? {
                      ...step,
                      position: {
                        x: state.originX,
                        y: state.originY
                      }
                    }
                  : step
              );

              if (linkExists) {
                return { ...trace, steps: updatedSteps, links: existingLinks };
              }

              const newLink = {
                id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                from: state.stepId,
                to: targetId
              };

              return {
                ...trace,
                steps: updatedSteps,
                links: [...existingLinks, newLink]
              };
            })
          );
        }
      }

      if (!linkCreated) {
        setTraces((prev) =>
          prev.map((trace) => {
            if (trace.id !== state.traceId) {
              return trace;
            }
            return { ...trace, links: trace.links || [] };
          })
        );
      }

      dragStateRef.current = { active: false, didMove: false, lastClientX: null, lastClientY: null };
      setDraggingStepId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setTraces]);

  useEffect(() => {
     return () => {
      if (typeof window === 'undefined') {
        return;
      }
      nodeObserversRef.current.forEach(({ observer }) => observer.disconnect());
      nodeObserversRef.current.clear();
      nodeRefCallbacksRef.current.clear();
    };
  }, []);

  const handleNodeMouseDown = (event, step) => {
    if (event.button !== 0) {
      return;
    }
    if (event.detail > 1) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    if (!canvasRef.current || !activeTraceId) {
      return;
    }

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const stepPosition = step.position || { x: 0, y: 0 };

    setSelectedStepId(step.id);

    dragStateRef.current = {
      active: true,
      stepId: step.id,
      traceId: activeTraceId,
      offsetX: event.clientX - (canvasRect.left + stepPosition.x),
      offsetY: event.clientY - (canvasRect.top + stepPosition.y),
      originX: stepPosition.x,
      originY: stepPosition.y,
      didMove: false,
      lastClientX: event.clientX,
      lastClientY: event.clientY
    };

    setDraggingStepId(step.id);
  };

  const handleSaveTrace = () => {
    if (!activeTrace) {
      return;
    }

    const defaultName =
      activeTrace.label && (activeTrace.isDraft || activeTrace.id?.startsWith('draft-'))
        ? activeTrace.label.replace(/_draft$/i, '')
        : activeTrace.label || formatTraceName(new Date());

    const newLabel = window.prompt('Save trace as', defaultName);
    if (!newLabel || !newLabel.trim()) {
      return;
    }

    commitTraceRename(activeTrace, newLabel, { forcePermanent: true });
  };

  const handleNodeDoubleClick = (event, step) => {
    event.stopPropagation();
    dragStateRef.current = { active: false, didMove: false, lastClientX: null, lastClientY: null };
    setDraggingStepId(null);
    setTraces((prev) =>
      prev.map((trace) => {
        if (trace.id !== activeTraceId) {
          return trace;
        }
        const updatedSteps = (trace.steps || []).filter((entry) => entry.id !== step.id);
        const updatedLinks = (trace.links || []).filter(
          (link) => link.from !== step.id && link.to !== step.id
        );
        return { ...trace, steps: updatedSteps, links: updatedLinks };
      })
    );
    setNodeDimensions((prev) => {
      if (!prev[step.id]) {
        return prev;
      }
      const next = { ...prev };
      delete next[step.id];
      return next;
    });
    setSelectedStepId((prevSelected) => (prevSelected === step.id ? null : prevSelected));
  };

  useEffect(() => {
    if (!traceContextMenu) return;
    const handleClickAway = (event) => {
      const menu = document.querySelector('.trace-context-menu');
      if (menu && !menu.contains(event.target)) {
        setTraceContextMenu(null);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setTraceContextMenu(null);
      }
    };
    document.addEventListener('click', handleClickAway);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleClickAway);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [traceContextMenu]);

  useEffect(() => {
    if (!nodeContextMenu) {
      return;
    }

    const handleClickAway = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        if (target.closest('.trace-node-context-menu')) {
          return;
        }
      }
      setNodeContextMenu(null);
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setNodeContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickAway);
    document.addEventListener('contextmenu', handleClickAway);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickAway);
      document.removeEventListener('contextmenu', handleClickAway);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [nodeContextMenu]);

  useEffect(() => {
    if (!nodePropertiesModal) {
      return;
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeNodePropertiesModal();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [nodePropertiesModal, closeNodePropertiesModal]);

  return (
    <div className={`agent-tab-content ${showChatbot ? 'with-chatbot' : ''}`}>
      <div className="agent-tab-main decision-trace-layout">
        <div className="trace-sidebar">
          <div className="trace-actions">
            <button type="button" className="trace-action-btn primary" onClick={handleNewTrace}>New</button>
          <button type="button" className="trace-action-btn" onClick={handleSaveTrace}>Save</button>
            <button
              type="button"
              className="trace-action-btn danger"
              onClick={() => {
                if (!activeTraceId) {
                  return;
                }
                confirmAndDeleteTrace(activeTraceId);
              }}
            >
              Delete
            </button>
          </div>
            <div className="trace-accordion">
            <div className={`trace-accordion-section ${isTraceExplorerOpen ? 'open' : ''}`}>
              <button
                className="trace-accordion-header"
                onClick={() => setIsTraceExplorerOpen((prev) => !prev)}
                aria-expanded={isTraceExplorerOpen}
              >
                <span className="trace-accordion-title">Trace Explorer</span>
                <svg
                  className={`trace-accordion-arrow ${isTraceExplorerOpen ? 'expanded' : ''}`}
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {isTraceExplorerOpen && (
                <div className="trace-accordion-body">
                  {traces.length > 0 ? (
                    <div className="trace-explorer-list">
                      {traces.map((trace, index) => {
                        const tagValue =
                          index === 0 && trace.type === 'new'
                            ? 'new'
                            : trace.isDraft
                              ? 'draft'
                              : trace.type;

                        return (
                        <button
                          key={trace.id}
                          className={`trace-explorer-item ${trace.id === activeTraceId ? 'active' : ''}`}
                          onClick={() => handleSelectTrace(trace.id)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setTraceContextMenu({
                              id: trace.id,
                              x: e.clientX,
                              y: e.clientY
                            });
                          }}
                        >
                          <div className="trace-explorer-meta">
                            <span className="trace-explorer-time">{trace.timestamp}</span>
                            <span className={`trace-explorer-tag trace-explorer-tag-${tagValue}`}>{tagValue}</span>
                          </div>
                          <div className="trace-explorer-title">{trace.label}</div>
                          {trace.owner && <div className="trace-explorer-owner">Owned by {trace.owner}</div>}
                        </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="trace-menu-empty">No trace steps recorded</div>
                  )}
                </div>
              )}
            </div>

            <div className={`trace-accordion-section ${isTraceTypesOpen ? 'open' : ''}`}>
              <button
                className="trace-accordion-header"
                onClick={() => setIsTraceTypesOpen((prev) => !prev)}
                aria-expanded={isTraceTypesOpen}
              >
                <span className="trace-accordion-title">Trace Type Steps</span>
                <svg
                  className={`trace-accordion-arrow ${isTraceTypesOpen ? 'expanded' : ''}`}
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {isTraceTypesOpen && (
                <div className="trace-accordion-body">
                  <div className="trace-menu-sections">
                    {stepCategories.map((category) => (
                      <button
                        key={category.id}
                        className={`trace-menu-header trace-menu-header-static ${draggingCategoryId === category.id ? 'dragging' : ''}`}
                        draggable
                        onDragStart={(event) => handleCategoryDragStart(event, category)}
                        onDragEnd={handleCategoryDragEnd}
                        onClick={() => handleToggleCategory(category.id)}
                      >
                        <span className="trace-menu-icon" aria-hidden="true">
                          {category.icon}
                        </span>
                        <span className="trace-menu-text">
                          <span className="trace-menu-label">{category.label}</span>
                          <span className="trace-menu-sub">{category.description}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="decision-trace-canvas-wrapper">
          <div className="trace-tab-strip">
            {sortedOpenTraces.length === 0 ? (
              <div className="trace-tab empty">No open traces</div>
            ) : (
              sortedOpenTraces.map((traceTab) => (
                <button
                  key={traceTab.id}
                  className={`trace-tab ${traceTab.id === activeTraceId ? 'active' : ''}`}
                  onClick={() => handleSelectTrace(traceTab.id)}
                >
                  {traceTab.label}
                </button>
              ))
            )}
          </div>
          <div
            ref={canvasRef}
            className={`decision-trace-canvas ${isCanvasDragActive ? 'drag-active' : ''}`}
            onDragEnter={handleCanvasDragEnter}
            onDragOver={handleCanvasDragOver}
            onDragLeave={handleCanvasDragLeave}
            onDrop={handleCanvasDrop}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedStepId(null);
              }
            }}
          >
          {activeTrace && (
            <div className="trace-canvas-toolbar">
              <button
                type="button"
                className="trace-export-trigger"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const buttonRect = event.currentTarget.getBoundingClientRect();
                  setTraceContextMenu({
                    id: activeTraceId,
                    x: buttonRect.right - 160,
                    y: buttonRect.bottom + 8,
                    mode: 'export'
                  });
                }}
              >
                Export Trace
              </button>
            </div>
          )}
          {activeTrace && (
            <div className={`trace-overlay ${decisionTraceTimeline.length > 0 ? 'with-content' : ''}`}>
              <div className="trace-overlay-tab">{getTraceDisplayName(activeTrace)}</div>
              <div className="trace-overlay-body">
                {decisionTraceTimeline.length === 0 ? (
                  <p>This trace workspace is ready. Add steps from the panel to begin capturing lineage.</p>
                ) : null}
              </div>
            </div>
          )}
          <div className="decision-trace-graph">
            {decisionTraceTimeline.length > 0 && (activeTrace?.links || []).length > 0 && (
              <svg className="trace-links-layer" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <marker
                    id="trace-arrowhead"
                    markerWidth="12"
                    markerHeight="12"
                    refX="10"
                    refY="6"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                  <path d="M2 2 L10 6 L2 10 Z" fill="rgba(29, 78, 216, 0.9)" />
                  </marker>
                </defs>
                {(activeTrace?.links || []).map((link) => {
                  const source = decisionTraceTimeline.find((step) => step.id === link.from);
                  const target = decisionTraceTimeline.find((step) => step.id === link.to);

                  if (!source || !target || !source.position || !target.position) {
                    return null;
                  }

                  const DEFAULT_NODE_RADIUS = 37;
                  const sourceDimensions = nodeDimensions[source.id];
                  const targetDimensions = nodeDimensions[target.id];
                  const sourceRadius = sourceDimensions ? Math.max(sourceDimensions.width, sourceDimensions.height) / 2 : DEFAULT_NODE_RADIUS;
                  const targetRadius = targetDimensions ? Math.max(targetDimensions.width, targetDimensions.height) / 2 : DEFAULT_NODE_RADIUS;
                  const { x: x1, y: y1 } = source.position;
                  const { x: x2, y: y2 } = target.position;

                  const deltaX = x2 - x1;
                  const deltaY = y2 - y1;
                  const distance = Math.hypot(deltaX, deltaY);
                  const halfDistance = distance / 2;
                  const maxOffsetForDistance = Math.max(0, halfDistance - 8);
                  const startOffset = Math.min(Math.max(sourceRadius, 16), maxOffsetForDistance);
                  const endOffset = Math.min(Math.max(targetRadius, 16), maxOffsetForDistance);

                  let startX = x1;
                  let startY = y1;
                  let endX = x2;
                  let endY = y2;

                  if (distance > 0) {
                    const startRatio = startOffset > 0 ? Math.min(startOffset, halfDistance - 2) / distance : 0;
                    const endRatio = endOffset > 0 ? Math.min(endOffset, halfDistance - 2) / distance : 0;
                    startX = x1 + deltaX * startRatio;
                    startY = y1 + deltaY * startRatio;
                    endX = x2 - deltaX * endRatio;
                    endY = y2 - deltaY * endRatio;
                  }

                  const adjustedDeltaX = endX - startX;
                  const adjustedDeltaY = endY - startY;
                  const curveFactor = 0.25;
                  const controlX1 = startX + adjustedDeltaX * curveFactor;
                  const controlY1 = startY + adjustedDeltaY * curveFactor;
                  const controlX2 = endX - adjustedDeltaX * curveFactor;
                  const controlY2 = endY - adjustedDeltaY * curveFactor;

                  return (
                    <path
                      key={link.id}
                      className="trace-link-path"
                      d={`M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`}
                      markerEnd="url(#trace-arrowhead)"
                      onDoubleClick={() => {
                        setTraces((prev) =>
                          prev.map((trace) => {
                            if (trace.id !== activeTraceId) {
                              return trace;
                            }
                            return {
                              ...trace,
                              links: (trace.links || []).filter((existing) => existing.id !== link.id)
                            };
                          })
                        );
                      }}
                    />
                  );
                })}
              </svg>
            )}
            {decisionTraceTimeline.length > 0 ? (
              decisionTraceTimeline.map((step) => {
                const categoryMeta = stepCategoryMap[step.type] || {};
                const displayIcon = step.icon || categoryMeta.icon || '⬚';
                const displayLabel = step.label || categoryMeta.label || 'Step';

                return (
                  <div
                    className={`trace-node-instance ${draggingStepId === step.id ? 'dragging' : ''} ${selectedStepId === step.id ? 'selected' : ''}`}
                    key={step.id}
                    data-step-id={step.id}
                    style={{
                      left: `${step.position?.x || 0}px`,
                      top: `${step.position?.y || 0}px`
                    }}
                    onMouseDown={(event) => handleNodeMouseDown(event, step)}
                    onDoubleClick={(event) => handleNodeDoubleClick(event, step)}
                    onContextMenu={(event) => handleNodeContextMenu(event, step)}
                  >
                    <div
                      ref={getNodeRefCallback(step.id)}
                      className={`trace-node trace-node-compact ${step.type}`}
                    >
                      <div className="trace-node-icon" aria-hidden="true">
                        {displayIcon}
                      </div>
                      <div className="trace-node-title">{displayLabel}</div>
                    </div>
                  </div>
                );
              })
            ) : !activeTrace ? (
              <div className="decision-trace-empty-state">
                <p>No decision trace data available</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
      {renderChatbot && renderChatbot()}
      {renderedContextMenu}
      {renderedNodeContextMenu}
      {renderedNodePropertiesModal}
    </div>
  );
}

export default DecisionTrace;

