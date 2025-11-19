/**
 * Domain Configuration Editor
 * UI for editing domain configurations
 */
import React, { useState } from 'react';
import { useDomainConfig } from '../../hooks/useDomainConfig';
import { configToYaml } from '../../config/utils/yamlLoader';

export interface DomainConfigEditorProps {
  onSave?: (config: string) => void;
  className?: string;
}

export function DomainConfigEditor({ onSave, className = '' }: DomainConfigEditorProps) {
  const domainConfig = useDomainConfig();
  const [yamlContent, setYamlContent] = useState(() => configToYaml(domainConfig));
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    if (onSave) {
      onSave(yamlContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setYamlContent(configToYaml(domainConfig));
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className={`domain-config-editor ${className}`}>
        <div className="domain-config-viewer">
          <h3>Domain Configuration: {domainConfig.metadata.name}</h3>
          <pre>{yamlContent}</pre>
          <button onClick={() => setIsEditing(true)}>Edit Configuration</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`domain-config-editor ${className}`}>
      <div className="domain-config-editor-form">
        <h3>Edit Domain Configuration</h3>
        <textarea
          value={yamlContent}
          onChange={(e) => setYamlContent(e.target.value)}
          rows={20}
          style={{ width: '100%', fontFamily: 'monospace' }}
        />
        <div className="domain-config-editor-actions">
          <button onClick={handleSave}>Save</button>
          <button onClick={handleCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

