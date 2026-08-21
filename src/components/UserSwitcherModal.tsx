import React, { useState } from 'react';
import { Usuario } from '../types';
import { Shield, UserCheck, KeyRound, Check, X, Lock, Users, ArrowRight } from 'lucide-react';

interface Props {
  usuarios: Usuario[];
  usuarioAtual: Usuario;
  isOpen: boolean;
  onClose: () => void;
  onSelecionarUsuario: (usuario: Usuario) => void;
}

export const UserSwitcherModal: React.FC<Props> = ({
  usuarios,
  usuarioAtual,
  isOpen,
  onClose,
  onSelecionarUsuario,
}) => {
  if (!isOpen) return null;

  const [usuarioSelecionadoId, setUsuarioSelecionadoId] = useState<string>(usuarioAtual.id);
  const [pinDigitado, setPinDigitado] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const usuariosAtivos = usuarios.filter((u) => u.ativo);
  const usuarioTarget = usuarios.find((u) => u.id === usuarioSelecionadoId) || usuarioAtual;

  const handleTrocaRapida = (u: Usuario) => {
    setUsuarioSelecionadoId(u.id);
    setPinDigitado('');
    setErro(null);
  };

  const handleConfirmar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioTarget) return;

    // Se o usuário tem PIN configurado e foi digitado ou teste rápido
    if (usuarioTarget.pinAcesso && pinDigitado && pinDigitado !== usuarioTarget.pinAcesso) {
      setErro('PIN incorreto. Tente novamente ou use o PIN padrão cadastrado.');
      return;
    }

    onSelecionarUsuario(usuarioTarget);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-800/80 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                Trocar Operador / Sessão
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Selecione o colaborador logado no terminal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleConfirmar} className="p-4 space-y-4 text-xs">
          {/* User selector list */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {usuariosAtivos.map((u) => {
              const isSelected = u.id === usuarioSelecionadoId;
              const isCurrent = u.id === usuarioAtual.id;

              return (
                <button
                  type="button"
                  key={u.id}
                  onClick={() => handleTrocaRapida(u)}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white ${
                        u.perfil === 'ADMIN'
                          ? 'bg-purple-600'
                          : u.perfil === 'GERENTE'
                          ? 'bg-blue-600'
                          : u.perfil === 'ENTREGADOR'
                          ? 'bg-amber-600'
                          : 'bg-emerald-600'
                      }`}
                    >
                      {u.nome[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white">{u.nome}</span>
                        {isCurrent && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                            ATUAL
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block">{u.cargo || u.perfil}</span>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                </button>
              );
            })}
          </div>

          {/* Quick PIN input */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-blue-500" />
                <span>PIN de Acesso (Opcional no modo preview):</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                PIN: {usuarioTarget.pinAcesso || '1234'}
              </span>
            </div>
            <input
              type="password"
              maxLength={6}
              value={pinDigitado}
              onChange={(e) => {
                setPinDigitado(e.target.value);
                setErro(null);
              }}
              placeholder={`Digite o PIN de ${usuarioTarget.nome.split(' ')[0]} (ou deixe vazio)`}
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {erro && (
            <p className="text-rose-500 dark:text-rose-400 text-xs font-semibold">{erro}</p>
          )}

          {/* Footer */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black shadow-md flex items-center gap-1.5 active:scale-95"
            >
              <span>Alternar para {usuarioTarget.nome.split(' ')[0]}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
