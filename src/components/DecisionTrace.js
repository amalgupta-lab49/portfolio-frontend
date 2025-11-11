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

const buildInitialFlowFromEntry = (entry) => {
  if (!entry) {
    return { steps: [], links: [] };
  }

  const baseTimestamp = formatTraceTime(new Date());
  const steps = [];
  const links = [];
  const baseY = 220;
  const baseX = 220;
  const xSpacing = 220;

  const createStep = (type, label, description, index) => {
    const id = `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    steps.push({
      id,
      type,
      label,
      description,
      timestamp: baseTimestamp,
      owner: 'Audit Flow',
      position: {
        x: baseX + index * xSpacing,
        y: baseY
      }
    });
    return id;
  };

  let index = 0;
  const promptText = entry.prompt || entry.context || '';
  if (promptText) {
    createStep('llm', `${entry.title || 'Analysis'} Prompt`, promptText, index++);
  }

  if (entry.kind === 'bullets' && Array.isArray(entry.bullets) && entry.bullets.length) {
    createStep('rag', 'Context Snapshot', entry.bullets.join('\n'), index++);
  }

  if (entry.kind === 'tool' && entry.tool) {
    const toolDescription = entry.tool.inputs
      ? JSON.stringify(entry.tool.inputs, null, 2)
      : entry.tool.description || '';
    createStep('tooling', entry.tool.name || 'Tool Invocation', toolDescription, index++);
  }

  if (entry.kind === 'agent') {
    createStep('agent', 'Agent Handoff', entry.output || 'Agent coordination step', index++);
  }

  if (entry.kind === 'rag' && entry.output) {
    createStep('rag', 'Retrieved Context', entry.output, index++);
  }

  const responseDescription = entry.output || entry.summary || 'No output captured.';
  createStep('response', 'Result Summary', responseDescription, index++);

  for (let i = 0; i < steps.length - 1; i += 1) {
    links.push({
      id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      from: steps[i].id,
      to: steps[i + 1].id
    });
  }

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

  const canvasRef = useRef(null);
  const pendingCenteredTraceRef = useRef(null);
  const dragStateRef = useRef({ active: false, didMove: false, lastClientX: null, lastClientY: null });
  const nodeObserversRef = useRef(new Map());
  const nodeRefCallbacksRef = useRef(new Map());
  const draftsLoadedRef = useRef(false);
  const lastAuditRequestIdRef = useRef(null);
  const hasPersistedSessionRef = useRef(false);
  useEffect(() => {
    if (!auditTraceRequest || auditTraceRequest.id === lastAuditRequestIdRef.current) {
      return;
    }

    spawnNewTrace({
      sectionLabel: auditTraceRequest.section,
      label: auditTraceRequest.label,
      entry: auditTraceRequest.entry
    });
    lastAuditRequestIdRef.current = auditTraceRequest.id;
    if (onAuditTraceConsumed) {
      onAuditTraceConsumed();
    }
  }, [auditTraceRequest, onAuditTraceConsumed]);


  const activeTrace = useMemo(() => traces.find((trace) => trace.id === activeTraceId) || null, [traces, activeTraceId]);

  const decisionTraceTimeline = useMemo(() => activeTrace?.steps || [], [activeTrace]);

  const sortedOpenTraces = useMemo(() => {
    return traces
      .map((trace) => ({
        id: trace.id,
        label:
          trace.label && trace.label.length > 18
            ? `${trace.label.slice(0, 15)}…`
            : trace.label || 'Untitled'
      }))
      .slice(0, 12);
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

  const createTraceShell = (date = new Date()) => ({
     id: `trace-${date.getTime()}`,
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
  });

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
      }
    };

    loadDrafts();

    return () => {
      cancelled = true;
    };
  }, []);

  const spawnNewTrace = ({ sectionLabel, label, entry } = {}) => {
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

    const initialFlow = buildInitialFlowFromEntry(entry);

    const newTrace = {
      ...createTraceShell(now),
      label: traceLabel,
      isDraft: true,
      baseTraceId: null,
      steps: initialFlow.steps,
      links: initialFlow.links
    };
    const nextTraces = [newTrace, ...traces];
    setTraces(nextTraces);
    setActiveTraceId(newTrace.id);
    setIsTraceExplorerOpen(true);
    saveDraftsToIndexedDB(nextTraces).catch((error) =>
      console.error('Failed to save new draft trace', error)
    );
    return newTrace;
  };

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

  const handleNewTrace = () => {
    spawnNewTrace();
  };

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
      const created = spawnNewTrace();
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
      createdTrace = spawnNewTrace();
      targetTraceId = createdTrace.id;
      pendingCenteredTraceRef.current = targetTraceId;
    }

    setTraces((prev) => {
      let workingTraces = prev;

      if (createdTrace) {
        workingTraces = [createdTrace, ...prev];
      } else {
        workingTraces = [...prev];
      }

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

      return workingTraces.map((trace) => {
        if (trace.id !== targetTraceId) {
          return trace;
        }
        const updatedSteps = [...(trace.steps || []), newStep];
        return { ...trace, steps: updatedSteps, links: trace.links || [] };
      });
    });

    pendingCenteredTraceRef.current = null;
    if (createdStepId) {
      setSelectedStepId(createdStepId);
    }
  };

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

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof indexedDB === 'undefined' ||
      !draftsLoadedRef.current
    ) {
      return;
    }

    let cancelled = false;

    const persistDrafts = async () => {
      try {
        if (cancelled) {
          return;
        }

        if (!traces.length) {
          if (!hasPersistedSessionRef.current) {
            return;
          }
          await writeDraftsToDB([]);
          hasPersistedSessionRef.current = false;
          return;
        }

        await saveDraftsToIndexedDB(traces);
        hasPersistedSessionRef.current = true;
      } catch (error) {
        console.error('Failed to persist decision trace drafts', error);
      }
    };

    persistDrafts();

    return () => {
      cancelled = true;
    };
  }, [traces, saveDraftsToIndexedDB]);

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
              <div className="trace-overlay-tab">{activeTrace.label}</div>
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
                    <path d="M2 2 L10 6 L2 10 Z" fill="rgba(67, 56, 202, 0.9)" />
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
    </div>
  );
}

export default DecisionTrace;

