import React, { useState, useEffect } from 'react';
import { Entregador, Veiculo, TurnoEntregador } from '../types';
import {
  Bike,
  Car,
  DollarSign,
  Gauge,
  PlayCircle,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  UserCheck,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entregadores: Entregador[];
  veiculos: Veiculo[];
  onTurnoIniciado: (turno: TurnoEntregador) => void;
}

export const AberturaTurnoModal: React.FC<Props> = ({
  isOpen,
  onClose,
  entregadores,
  veiculos,
  onTurnoIniciado,
}) => {
  const [entregadorId, setEntregadorId] = useState<string>('');
  const [veiculoId, setVeiculoId] = useState<string>('');
  const [trocoInicial, setTrocoInicial] = useState<string>('100.00');
  const [kmInicial, setKmInicial] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const veiculosDisponiveis = veiculos.filter(
    (v) => v.status === 'DISPONIVEL' || v.id === veiculoId
  );

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (entregadores.length > 0 && !entregadorId) {
        setEntregadorId(entregadores[0].id);
      }
      if (veiculosDisponiveis.length > 0 && !veiculoId) {
        const v = veiculosDisponiveis[0];
        setVeiculoId(v.id);
        setKmInicial(v.kmAtual.toString());
      }
    }
  }, [isOpen, entregadores, veiculos]);

  // Atualiza KM inicial ao mudar veículo selecionado
  const handleVeiculoChange = (id: string) => {
    setVeiculoId(id);
    const vec = veiculos.find((v) => v.id === id);
    if (vec) {
      setKmInicial(vec.kmAtual.toString());
    }
  };

  const handleIniciarTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entregadorId) {
      setErrorMsg('Selecione um entregador.');
      return;
    }
    if (!veiculoId) {
      setErrorMsg('Selecione um veículo disponível para a entrega.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/turnos/abrir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entregadorId,
          veiculoId,
          trocoInicial: Number(trocoInicial) || 0,
          kmInicial: Number(kmInicial) || 0,
          observacoes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao iniciar o turno');
      }

      onTurnoIniciado(data.turno);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao comunicar com o servidor');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const entregadorSel = entregadores.find((e) => e.id === entregadorId);
  const veiculoSel = veiculos.find((v) => v.id === veiculoId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/80 rounded-xl text-blue-600 dark:text-blue-400">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Iniciar Turno de Entregador
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Seleção de veículo, liberação do troco inicial e conferência do odômetro
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleIniciarTurno} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Selecionar Entregador */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              Entregador *
            </label>
            <select
              value={entregadorId}
              onChange={(e) => setEntregadorId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500"
            >
              {entregadores.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome} {e.turnoAtivoId ? '(Em Turno Ativo)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Selecionar Veículo Disponível */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Bike className="w-3.5 h-3.5 text-emerald-600" />
              Veículo para a Jornada *
            </label>
            {veiculosDisponiveis.length === 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                Não há veículos cadastrados com status "Disponível". Cadastre ou libere um veículo no menu de veículos.
              </div>
            ) : (
              <select
                value={veiculoId}
                onChange={(e) => handleVeiculoChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500"
              >
                {veiculosDisponiveis.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.modelo} - Placa: {v.placa} ({v.kmAtual} km)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 3. Troco Inicial e Odômetro Inicial */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                Troco Concedido (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={trocoInicial}
                  onChange={(e) => setTrocoInicial(e.target.value)}
                  placeholder="100.00"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-blue-600" />
                Odômetro Inicial (KM) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={kmInicial}
                onChange={(e) => setKmInicial(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-bold font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Resumo do Turno */}
          {entregadorSel && veiculoSel && (
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Entregador:</span>
                <strong className="text-slate-900 dark:text-white">{entregadorSel.nome}</strong>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Veículo:</span>
                <strong className="text-slate-900 dark:text-white">{veiculoSel.modelo} ({veiculoSel.placa})</strong>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Valor em caixa (Troco):</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                  R$ {(Number(trocoInicial) || 0).toFixed(2)}
                </strong>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Observações de Abertura
            </label>
            <input
              type="text"
              placeholder="Ex: Capacete adicional entregue, troco em cédulas de 10 e 20"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || veiculosDisponiveis.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
            >
              <PlayCircle className="w-4 h-4" />
              {submitting ? 'Iniciando...' : 'Confirmar e Iniciar Turno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
