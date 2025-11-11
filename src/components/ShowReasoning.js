import React from 'react';
import ReactDOM from 'react-dom';

const ShowReasoning = ({
  section,
  title,
  logs = [],
  currentSection,
  onOpen,
  onClose,
  onCopyNotification,
  onAskAgent,
  onAuditTrace,
  editingThoughtId,
  editPrompt,
  setEditPrompt,
  editToolInputs,
  setEditToolInputs,
  beginEdit,
  cancelEdit,
  saveEdit,
  rerunThinking,
  thinkingEntry,
  thinkingText
}) => {
  const isOpen = currentSection === section;
  const safeLogs = Array.isArray(logs) ? logs : [];
  const hasToolInputs = safeLogs.some(entry => entry.kind === 'tool' && entry.tool?.inputs);

  const handleBubbleClick = (event) => {
    event.stopPropagation();
    onOpen && onOpen(section);
  };

  const handleClose = () => {
    onClose && onClose(section);
  };

  const triggerCopyNotification = (event) => {
    if (onCopyNotification) {
      onCopyNotification({ x: event.clientX, y: event.clientY });
    }
  };

  const formatEntries = (formatter) => safeLogs.map(formatter).join('\n\n\n');

  const handleClipboardCopy = (event, formatter) => {
    if (!navigator?.clipboard) return;
    const payload = formatter();
    if (!payload) return;
    navigator.clipboard.writeText(payload);
    triggerCopyNotification(event);
  };

  const handleCopyPrompts = (event) => {
    handleClipboardCopy(event, () => formatEntries((entry, index) => (
      `=== Entry ${index + 1}: ${entry.title} ===\nTime: ${entry.time}\n\nPROMPT:\n${entry.prompt}`
    )));
  };

  const handleCopyOutputs = (event) => {
    handleClipboardCopy(event, () => formatEntries((entry, index) => (
      `=== Entry ${index + 1}: ${entry.title} ===\nTime: ${entry.time}\n\nOUTPUT:\n${entry.output}`
    )));
  };

  const handleCopyToolInputs = (event) => {
    const toolEntries = safeLogs.filter(entry => entry.kind === 'tool' && entry.tool?.inputs);
    if (!toolEntries.length) return;
    handleClipboardCopy(event, () => toolEntries.map((entry, index) => (
      `=== Entry ${index + 1}: ${entry.title} ===\nTime: ${entry.time}\nTool: ${entry.tool.name}\n\nTOOL INPUTS:\n${JSON.stringify(entry.tool.inputs, null, 2)}`
    )).join('\n\n\n'));
  };

  const handleCopyAll = (event) => {
    handleClipboardCopy(event, () => formatEntries((entry, index) => {
      let content = `=== Entry ${index + 1}: ${entry.title} ===\nTime: ${entry.time}\n\nPROMPT:\n${entry.prompt}`;

      if (entry.kind === 'tool' && entry.tool?.inputs) {
        content += `\n\nTOOL INPUTS:\n${JSON.stringify(entry.tool.inputs, null, 2)}`;
      }

      if (entry.kind === 'bullets' && entry.bullets) {
        content += `\n\nKEY POINTS:\n${entry.bullets.map(item => `- ${item}`).join('\n')}`;
      }

      if (entry.kind === 'code' && entry.code?.content) {
        content += `\n\nCODE (${entry.code.language}):\n${entry.code.content}`;
      }

      content += `\n\nOUTPUT:\n${entry.output}`;
      return content;
    }));
  };

  const handleAskAgent = () => {
    if (!onAskAgent) return;

    const payload = formatEntries((entry, index) => {
      let content = `=== Entry ${index + 1}: ${entry.title} ===\nTime: ${entry.time}\n\nPROMPT:\n${entry.prompt}`;

      if (entry.kind === 'tool' && entry.tool?.inputs) {
        content += `\n\nTOOL INPUTS:\n${JSON.stringify(entry.tool.inputs, null, 2)}`;
      }

      if (entry.kind === 'bullets' && entry.bullets) {
        content += `\n\nKEY POINTS:\n${entry.bullets.map(item => `- ${item}`).join('\n')}`;
      }

      if (entry.kind === 'code' && entry.code?.content) {
        content += `\n\nCODE (${entry.code.language}):\n${entry.code.content}`;
      }

      content += `\n\nOUTPUT:\n${entry.output}`;
      return content;
    });

    onAskAgent(payload, section);
  };

  const renderContent = () => (
    <div className="thinking-popover-centered" onClick={(event) => event.stopPropagation()}>
      <div className="thinking-popover-overlay" onClick={handleClose}></div>
      <div className="thinking-popover-content">
        <div className="thinking-popover-header">
          <span>{title} - Agent Thoughts</span>
          <button className="popover-close" onClick={handleClose}>✕</button>
        </div>
        <div className="thinking-actions">
          <button className="analysis-action-button secondary" onClick={handleCopyPrompts}>Copy Prompts</button>
          <button className="analysis-action-button secondary" onClick={handleCopyOutputs}>Copy Outputs</button>
          {hasToolInputs && (
            <button className="analysis-action-button secondary" onClick={handleCopyToolInputs}>Copy Tool Inputs</button>
          )}
          <button className="analysis-action-button secondary" onClick={handleCopyAll}>Copy All</button>
          <button className="analysis-action-button ask-agent-button" onClick={handleAskAgent}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              <line x1="9" y1="10" x2="15" y2="10"></line>
              <line x1="12" y1="7" x2="12" y2="13"></line>
            </svg>
            Ask Agent
          </button>
        </div>
        <div className="thinking-panel">
          <div className="thinking-log">
            {safeLogs.length === 0 ? (
              <div className="thinking-empty-state">No reasoning data captured yet.</div>
            ) : (
              safeLogs.map((entry) => {
                const isEditing = editingThoughtId === entry.id;
                const isThinking =
                  thinkingEntry &&
                  thinkingEntry.section === section &&
                  thinkingEntry.entryId === entry.id;

                let baseTitle = entry.title || 'Untitled Entry';
                let subSectionName =
                  entry.subSection ||
                  entry.subsection ||
                  entry.subSectionName ||
                  entry.subsectionName ||
                  '';

                if (!subSectionName && baseTitle.includes(' - ')) {
                  const parts = baseTitle.split(' - ');
                  baseTitle = parts.shift();
                  subSectionName = parts.join(' - ');
                }

                return (
                  <div key={entry.id} className="thinking-item">
                    <div className="thinking-item-header">
                      <div className="thinking-item-meta">
                        <span className="thinking-time">{entry.time}</span>
                        <span className="thinking-title">{baseTitle}</span>
                        {subSectionName && (
                          <span className="thinking-subsection">{subSectionName}</span>
                        )}
                        <span className={`thinking-kind pill kind-${entry.kind}`}>{entry.kind}</span>
                      </div>
                      <div className="thinking-item-actions">
                        {isEditing ? (
                          <>
                            <button className="tiny-button" onClick={() => saveEdit(entry, section)}>Save</button>
                            <button className="tiny-button ghost" onClick={cancelEdit}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button
                              className="tiny-button audit-trace-button"
                              onClick={() =>
                                onAuditTrace && onAuditTrace(entry, section, subSectionName || baseTitle)
                              }
                            >
                              Audit Trace
                            </button>
                            <button className="tiny-button" onClick={() => beginEdit(entry, section)}>Edit</button>
                            <button className="tiny-button" onClick={() => rerunThinking(entry, section)}>Re-run</button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="thinking-blocks">
                      <div className="thinking-block">
                        <div className="thinking-block-label">Prompt</div>
                        {isEditing ? (
                          <textarea
                            className="thinking-input"
                            value={editPrompt}
                            onChange={(event) => setEditPrompt && setEditPrompt(event.target.value)}
                          />
                        ) : (
                          <pre className="thinking-code"><code>{entry.prompt}</code></pre>
                        )}
                      </div>

                      {entry.kind === 'tool' && (
                        <div className="thinking-block">
                          <div className="thinking-block-label">Tool Inputs ({entry.tool?.name})</div>
                          {isEditing ? (
                            <div className="tool-inputs">
                              {Object.keys(editToolInputs || {}).map((key) => (
                                <label key={key} className="tool-input-row">
                                  <span>{key}</span>
                                  <input
                                    className="tool-input"
                                    type="text"
                                    value={String(editToolInputs[key])}
                                    onChange={(event) => setEditToolInputs && setEditToolInputs({ ...editToolInputs, [key]: event.target.value })}
                                  />
                                </label>
                              ))}
                              {(!editToolInputs || Object.keys(editToolInputs).length === 0) && (
                                <div className="tool-input-empty">No editable inputs exposed.</div>
                              )}
                            </div>
                          ) : (
                            <pre className="thinking-code"><code>{JSON.stringify(entry.tool?.inputs || {}, null, 2)}</code></pre>
                          )}
                        </div>
                      )}

                      {entry.kind === 'bullets' && (
                        <div className="thinking-block">
                          <div className="thinking-block-label">Key Points</div>
                          <ul className="thinking-list">
                            {(entry.bullets || []).map((bullet, idx) => (
                              <li key={idx}>{bullet}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {entry.kind === 'code' && (
                        <div className="thinking-block">
                          <div className="thinking-block-label">Code ({entry.code?.language || 'text'})</div>
                          <pre className="thinking-code"><code>{entry.code?.content || ''}</code></pre>
                        </div>
                      )}

                      <div className="thinking-block">
                        <div className="thinking-block-label">Output</div>
                        {isThinking ? (
                          <div className="thinking-animation">
                            <pre className="thinking-code thinking-realtime"><code>{thinkingText}</code></pre>
                            <div className="thinking-loader"></div>
                          </div>
                        ) : (
                          <pre className="thinking-code"><code>{entry.output}</code></pre>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button className="reasoning-bubble" onClick={handleBubbleClick} title="Show Reasoning">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </button>
      {isOpen && ReactDOM.createPortal(renderContent(), document.body)}
    </>
  );
};

export default ShowReasoning;
