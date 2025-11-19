/**
 * Generic Section Renderer
 * Renders sections based on domain configuration
 */
import React from 'react';
import { UISection } from '../../config/types/DomainConfig';
import { PortfolioSection } from '../domains/portfolio/PortfolioSection';

// Component registry - maps component names to actual components
const componentRegistry: Record<string, React.ComponentType<any>> = {
  PortfolioSection: PortfolioSection,
};

export interface SectionRendererProps {
  section: UISection;
  data?: any;
  onAction?: (action: string, payload?: any) => void;
  showReasoningProps?: any;
}

export function SectionRenderer({ section, data, onAction, showReasoningProps }: SectionRendererProps) {
  if (!section.visible) {
    return null;
  }

  // If a custom component is specified, try to load it from registry
  if (section.component) {
    const Component = componentRegistry[section.component];
    if (Component) {
      return (
        <Component
          {...(section.props || {})}
          data={data}
          logs={Array.isArray(data) ? data : []}
          onAction={onAction}
          showReasoningProps={showReasoningProps}
        />
      );
    }
    // Fallback if component not found
    console.warn(`Component ${section.component} not found in registry`);
  }

  // Default rendering
  return (
    <div className="section-renderer" data-section-id={section.id}>
      <h3>{section.label}</h3>
      {data && <div className="section-content">{JSON.stringify(data, null, 2)}</div>}
    </div>
  );
}

