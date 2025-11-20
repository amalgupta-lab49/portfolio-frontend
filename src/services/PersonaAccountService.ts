/**
 * Persona Account Service
 * Manages role-persona account entries in localStorage
 */
import rolePersonaMapping from '../config/rolePersonaMapping.json';

export interface PersonaAccount {
  role: string;
  persona: string;
  id: string; // Unique identifier: role-persona
  displayName: string;
}

const STORAGE_KEY = 'personaAccounts';

/**
 * Get all available role-persona combinations
 */
export function getAllPersonaAccounts(): PersonaAccount[] {
  const accounts: PersonaAccount[] = [];
  const mapping = (rolePersonaMapping as any).rolePersonaMapping;

  Object.entries(mapping).forEach(([role, personas]: [string, any]) => {
    if (Array.isArray(personas)) {
      personas.forEach((persona: string) => {
        accounts.push({
          role,
          persona,
          id: `${role}-${persona}`,
          displayName: `${role} - ${persona}`,
        });
      });
    }
  });

  return accounts;
}

/**
 * Get stored accounts from localStorage
 */
export function getStoredAccounts(): PersonaAccount[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse stored accounts', e);
  }
  return [];
}

/**
 * Initialize accounts in localStorage if not present
 */
export function initializeAccounts(): void {
  const stored = getStoredAccounts();
  if (stored.length === 0) {
    const allAccounts = getAllPersonaAccounts();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allAccounts));
  }
}

/**
 * Get current active account
 */
export function getCurrentAccount(): PersonaAccount | null {
  const role = localStorage.getItem('userRole');
  const persona = localStorage.getItem('userPersona');
  
  if (role && persona) {
    return {
      role,
      persona,
      id: `${role}-${persona}`,
      displayName: `${role} - ${persona}`,
    };
  }
  
  return null;
}

/**
 * Set current account
 */
export function setCurrentAccount(role: string, persona: string): void {
  localStorage.setItem('userRole', role);
  localStorage.setItem('userPersona', persona);
}

