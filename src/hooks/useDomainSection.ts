/**
 * useDomainSection hook
 * Access specific section configuration from domain
 */
import { useDomainConfig } from './useDomainConfig';
import { UISection } from '../config/types/DomainConfig';

export function useDomainSection(sectionId: string): UISection | undefined {
  const config = useDomainConfig();
  return config.ui.sections.find((section) => section.id === sectionId);
}

export function useDomainSections(): UISection[] {
  const config = useDomainConfig();
  return config.ui.sections;
}

