import React from 'react';
import { MainTab } from './Navbar';
import { Usuario } from '../types';

export interface ModuloHeaderProps {
  activeTab?: MainTab;
  setActiveTab?: (tab: MainTab) => void;
  usuarioLogado?: Usuario | null;
  isSuperAdmin?: boolean;
  pedidosPendentesCount?: number;
  pedidosEmRotaCount?: number;
  pedidosEntreguesCount?: number;
  moduloNumero?: string | number;
  moduloCor?: string;
  titulo?: string;
  subtitulo?: string | React.ReactNode;
  children?: React.ReactNode;
}

/**
 * ModuloHeader: renderiza exclusivamente a barra de ações/filtros (children)
 * evitando duplicidade com a TopBar fixa do sistema.
 */
export const ModuloHeader: React.FC<ModuloHeaderProps> = ({ children }) => {
  if (!children) return null;

  return (
    <div className="flex items-center justify-end flex-wrap gap-2 py-0.5">
      {children}
    </div>
  );
};
