/**
 * Persona Context
 * Provides current user's role and persona information
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PersonaTabService, AgentConfig } from '../services/PersonaTabService';

export interface PersonaContextValue {
  role: string;
  persona: string;
  configuredAgents: AgentConfig[];
  setRole: (role: string) => void;
  setPersona: (persona: string) => void;
  setConfiguredAgents: (agents: AgentConfig[]) => void;
  hasCapability: (capability: string) => boolean;
}

const PersonaContext = createContext<PersonaContextValue | undefined>(undefined);

export interface PersonaProviderProps {
  children: ReactNode;
  defaultRole?: string;
  defaultPersona?: string;
  defaultAgents?: AgentConfig[];
}

export function PersonaProvider({
  children,
  defaultRole = 'Business',
  defaultPersona = 'PM',
  defaultAgents = [],
}: PersonaProviderProps) {
  const [role, setRole] = useState<string>(defaultRole);
  const [persona, setPersona] = useState<string>(defaultPersona);
  const [configuredAgents, setConfiguredAgents] = useState<AgentConfig[]>(defaultAgents);

  // Load from localStorage on mount
  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    const storedPersona = localStorage.getItem('userPersona');
    const storedAgents = localStorage.getItem('configuredAgents');

    if (storedRole) {
      setRole(storedRole);
    }
    if (storedPersona) {
      setPersona(storedPersona);
    }
    if (storedAgents) {
      try {
        setConfiguredAgents(JSON.parse(storedAgents));
      } catch (e) {
        console.error('Failed to parse configured agents from localStorage', e);
      }
    }
  }, []);

  // Persist to localStorage when changed
  useEffect(() => {
    localStorage.setItem('userRole', role);
  }, [role]);

  useEffect(() => {
    localStorage.setItem('userPersona', persona);
  }, [persona]);

  useEffect(() => {
    localStorage.setItem('configuredAgents', JSON.stringify(configuredAgents));
  }, [configuredAgents]);

  const hasCapability = (capability: string): boolean => {
    return PersonaTabService.hasCapability(role, capability);
  };

  const value: PersonaContextValue = {
    role,
    persona,
    configuredAgents,
    setRole,
    setPersona,
    setConfiguredAgents,
    hasCapability,
  };

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona(): PersonaContextValue {
  const context = useContext(PersonaContext);
  if (context === undefined) {
    throw new Error('usePersona must be used within a PersonaProvider');
  }
  return context;
}

