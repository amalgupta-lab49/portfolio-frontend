/**
 * Persona Tab Service
 * Generates tab configurations based on role-persona mapping and user's configured agents/insights
 */
import rolePersonaMapping from '../config/rolePersonaMapping.json';
import roleCapabilities from '../config/roleCapabilities.json';
import { TabConfig } from '../config/types/DomainConfig';

export interface AgentConfig {
  id: string;
  name: string;
  persona: string;
  insights: string[];
  icon?: string;
}

export interface PersonaTabOptions {
  userRole: string;
  userPersona: string;
  configuredAgents?: AgentConfig[];
  baseTabs?: TabConfig[];
}

export class PersonaTabService {
  /**
   * Get tabs for a specific role and persona
   */
  static getTabsForPersona(options: PersonaTabOptions): TabConfig[] {
    const { userRole, userPersona, configuredAgents = [], baseTabs = [] } = options;
    
    const roleMapping = (rolePersonaMapping as any).rolePersonaMapping[userRole];
    const capabilities = (roleCapabilities as any).roleCapabilities[userRole];
    
    if (!roleMapping || !capabilities) {
      console.warn(`No role mapping or capabilities found for role: ${userRole}`);
      return baseTabs;
    }

    // Verify persona belongs to role
    if (!roleMapping.includes(userPersona)) {
      console.warn(`Persona ${userPersona} does not belong to role ${userRole}`);
      return baseTabs;
    }

    const tabs: TabConfig[] = [];
    
    // Overview tab - always available if can view dashboards
    if (capabilities.canViewDashboards) {
      const overviewTab = baseTabs.find(tab => tab.id === 'overview') || {
        id: 'overview',
        label: this.getTabLabelForPersona(userPersona, 'overview', userRole),
        sections: this.getSectionsForPersona(userPersona, configuredAgents, baseTabs),
        default: true
      };
      
      // Update label based on persona and role (Portfolio only for Business-PM)
      overviewTab.label = this.getTabLabelForPersona(userPersona, 'overview', userRole);
      tabs.push(overviewTab);
    }

    // Decision Trace tab - only for Architect role (or any role with canViewAuditLogs)
    if (capabilities.canViewAuditLogs && userRole === 'Architect') {
      const decisionTab = baseTabs.find(tab => tab.special === 'decisionTrace') || {
        id: 'decision',
        label: 'Decision Trace',
        sections: [],
        icon: '🔍',
        special: 'decisionTrace' as const
      };
      tabs.push(decisionTab);
    }

    // Add other base tabs that are not overview or decision trace
    baseTabs.forEach(tab => {
      if (tab.id !== 'overview' && tab.special !== 'decisionTrace') {
        // Check if tab should be visible based on capabilities
        if (this.shouldShowTab(tab, capabilities)) {
          tabs.push(tab);
        }
      }
    });

    // Add persona-specific tabs based on configured agents
    configuredAgents.forEach(agent => {
      if (agent.persona === userPersona) {
        tabs.push({
          id: `agent-${agent.id}`,
          label: agent.name,
          sections: agent.insights,
          icon: agent.icon || '🤖'
        });
      }
    });

    return tabs;
  }

  /**
   * Get tab label for a specific persona and tab type
   * Portfolio dashboard naming is only for Business-PM role
   * Other roles use "<RoleName> Dashboard" format
   */
  private static getTabLabelForPersona(persona: string, tabType: string, role?: string): string {
    // Portfolio dashboard naming only for Business-PM
    if (persona === 'PM' && role === 'Business' && tabType === 'overview') {
      return 'Portfolio Overview';
    }

    // For all other roles, use "<RoleName> Dashboard" format
    if (tabType === 'overview' && role) {
      return `${role} Dashboard`;
    }

    // Fallback
    return 'Overview';
  }

  /**
   * Get sections for a specific persona based on configured agents
   */
  private static getSectionsForPersona(
    persona: string,
    configuredAgents: AgentConfig[],
    baseTabs: TabConfig[]
  ): string[] {
    // Find agent for this persona
    const agent = configuredAgents.find(a => a.persona === persona);
    
    if (agent && agent.insights.length > 0) {
      return agent.insights;
    }

    // Fallback to base tabs overview sections if available
    const overviewTab = baseTabs.find(tab => tab.id === 'overview');
    return overviewTab?.sections || [];
  }

  /**
   * Determine if a tab should be shown based on role capabilities
   */
  private static shouldShowTab(tab: TabConfig, capabilities: any): boolean {
    // Default: show tab if user can view dashboards
    return capabilities.canViewDashboards !== false;
  }

  /**
   * Get available personas for a role
   */
  static getPersonasForRole(role: string): string[] {
    return (rolePersonaMapping as any).rolePersonaMapping[role] || [];
  }

  /**
   * Get capabilities for a role
   */
  static getCapabilitiesForRole(role: string): any {
    return (roleCapabilities as any).roleCapabilities[role] || {};
  }

  /**
   * Check if role has specific capability
   */
  static hasCapability(role: string, capability: string): boolean {
    const capabilities = this.getCapabilitiesForRole(role);
    return capabilities[capability] === true;
  }
}

