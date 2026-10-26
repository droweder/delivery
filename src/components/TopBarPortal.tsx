import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface TopBarActionsProps {
  children: React.ReactNode;
}

/**
 * TopBarActions monta elementos (botões de ação, filtros e busca)
 * diretamente no slot reservado da TopBar fixa superior.
 */
export const TopBarActions: React.FC<TopBarActionsProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  const target = document.getElementById('topbar-actions-slot');
  if (!target) return null;

  return createPortal(children, target);
};
