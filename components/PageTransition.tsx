import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from '../lib/simple-router';
import { motion, AnimatePresence } from '../lib/motion'; // ✅ FIX: Import depuis lib/motion

export function PageTransition() {
  // Animations désactivées - pas de transition entre les pages
  return null;
}