import { ScrollArea } from './ui/scroll-area';
import { memo } from 'react';
import { PrivacyPolicy } from './shared/PrivacyPolicy';

/**
 * @deprecated Utilisez le composant PrivacyPolicy ou UnifiedPolicyModal à la place
 * Ce composant est conservé pour compatibilité descendante
 */
export const TermsAndConditions = memo(function TermsAndConditions() {
  return <PrivacyPolicy />;
});