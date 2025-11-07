import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './Dashboard.css';

function DecisionTrace({ showChatbot, renderChatbot }) {
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

  const activeTrace = useMemo(() => traces.find((trace) => trace.id === activeTraceId) || null, [traces, activeTraceId]);

  const decisionTraceTimeline = useMemo(() => activeTrace?.steps || [], [activeTrace]);

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

  const handleNewTrace = () => {
    const now = new Date();
    const newTrace = {
      id: `trace-${now.getTime()}`,
      label: formatTraceName(now),
      createdAt: now,
      timestamp: formatTraceTime(now),
      type: 'new',
      owner: 'You',
      steps: []
    };
    setTraces((prev) => [newTrace, ...prev]);
    setActiveTraceId(newTrace.id);
    setIsTraceExplorerOpen(true);
  };

  const handleSelectTrace = (traceId) => {
    setActiveTraceId(traceId);
    setTraceContextMenu(null);
  };

  const handleDeleteTrace = (traceId) => {
    setTraces((prev) => prev.filter((trace) => trace.id !== traceId));
    if (activeTraceId === traceId) {
      setActiveTraceId(null);
    }
    setTraceContextMenu(null);
  };

  const handleRenameTrace = (traceId) => {
    const trace = traces.find((t) => t.id === traceId);
    if (!trace) return;
    const newLabel = window.prompt('Rename trace', trace.label);
    if (newLabel && newLabel.trim()) {
      setTraces((prev) => prev.map((t) => t.id === traceId ? { ...t, label: newLabel.trim() } : t));
      if (activeTraceId === traceId) {
        setActiveTraceId(traceId); // trigger re-render for overlay label
      }
    }
    setTraceContextMenu(null);
  };

  const handleExportTrace = (traceId) => {
    const trace = traces.find((t) => t.id === traceId);
    if (!trace) return;
    const data = JSON.stringify(trace, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trace.label || 'trace'}.json`;
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
            <button type="button" className="trace-action-btn">Save</button>
            <button type="button" className="trace-action-btn danger">Delete</button>
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
                      {traces.map((trace) => (
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
                            <span className={`trace-explorer-tag trace-explorer-tag-${trace.type}`}>{trace.type}</span>
                          </div>
                          <div className="trace-explorer-title">{trace.label}</div>
                          {trace.owner && <div className="trace-explorer-owner">Owned by {trace.owner}</div>}
                        </button>
                      ))}
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
                  <div className="trace-menu-title">Step Categories</div>
                  <div className="trace-menu-sections">
                    {stepCategories.map((category) => {
                      const expanded = expandedCategories[category.id];
                      const categorySteps = stepsByCategory[category.id] || [];

                      return (
                        <div key={category.id} className={`trace-menu-section ${expanded ? 'expanded' : ''}`}>
                          <button
                            className="trace-menu-header"
                            onClick={() => toggleCategory(category.id)}
                            aria-expanded={expanded}
                          >
                            <span className="trace-menu-icon" aria-hidden="true">
                              {category.icon}
                            </span>
                            <span className="trace-menu-text">
                              <span className="trace-menu-label">{category.label}</span>
                              <span className="trace-menu-sub">{category.description}</span>
                            </span>
                            <svg
                              className={`trace-menu-arrow ${expanded ? 'expanded' : ''}`}
                              width="16"
                              height="16"
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
                          {expanded && (
                            <div className="trace-menu-body">
                              {categorySteps.length > 0 ? (
                                categorySteps.map((step) => (
                                  <div key={step.id} className="trace-menu-item">
                                    <div className="trace-menu-item-title">{step.label}</div>
                                    <div className="trace-menu-item-meta">
                                      <span className="trace-menu-item-time">{step.timestamp}</span>
                                      {step.owner && <span className="trace-menu-item-owner">{step.owner}</span>}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="trace-menu-empty">No entries yet</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="decision-trace-canvas">
          {activeTrace && (
            <div className="trace-overlay">
              <div className="trace-overlay-tab">{activeTrace.label}</div>
              <div className="trace-overlay-body">
                <p>This trace workspace is ready. Add steps from the panel to begin capturing lineage.</p>
              </div>
            </div>
          )}
          <div className="decision-trace-graph">
            {decisionTraceTimeline.length > 0 ? (
              decisionTraceTimeline.map((step, index) => (
                <div className="trace-node-wrapper" key={step.id}>
                  {index !== 0 && <div className="trace-connector" aria-hidden="true" />}
                  <div className={`trace-node ${step.type}`}>
                    <div className="trace-node-shape" aria-hidden="true"></div>
                    <div className="trace-node-content">
                      <div className="trace-node-header">
                        <span className="trace-node-label">{step.label}</span>
                        <span className="trace-node-time">{step.timestamp}</span>
                      </div>
                      <p className="trace-node-description">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : !activeTrace ? (
              <div className="decision-trace-empty-state">
                <p>No decision trace data available</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {renderChatbot && renderChatbot()}
      {traceContextMenu && ReactDOM.createPortal(
        <div className="trace-context-menu"
          style={{ left: `${traceContextMenu.x}px`, top: `${traceContextMenu.y}px` }}
        >
          <button className="trace-context-item" onClick={() => handleDeleteTrace(traceContextMenu.id)}>Delete</button>
          <button className="trace-context-item" onClick={() => handleRenameTrace(traceContextMenu.id)}>Rename</button>
          <button className="trace-context-item" onClick={() => handleExportTrace(traceContextMenu.id)}>Export</button>
        </div>,
        document.body
      )}
    </div>
  );
}

export default DecisionTrace;

