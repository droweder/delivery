import React, { useState } from 'react';
import { TurnoEntregador } from '../types';
import {
  History,
  Search,
  Calendar,
  Gauge,
  Bike,
  DollarSign,
  CheckCircle2,
  Clock,
  Filter,
  TrendingUp,
  PackageCheck,
  FileText,
  AlertTriangle,
  PlayCircle,
} from 'lucide-react';
import { formatarMoeda, formatarDataHora } from '../lib/thermalPrinter';
import { TopBarActions } from './TopBarPortal';

interface Props {
  turnos: TurnoEntregador[];
  buscaExterno?: string;
  onAbrirTurno?: () => void;
}

export const AbaHistoricoJornadas: React.FC<Props> = ({ turnos, buscaExterno, onAbrirTurno }) => {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [dataFiltro, setDataFiltro] = useState<string>('');

  const turnosFiltrados = turnos.filter((t) => {
    const termo = (buscaExterno !== undefined ? buscaExterno : busca).toLowerCase();
    const matchBusca =
      t.entregadorNome.toLowerCase().includes(termo) ||
      t.veiculoPlaca.toLowerCase().includes(termo) ||
      t.veiculoModelo.toLowerCase().includes(termo);

    const matchStatus = filtroStatus === 'TODOS' || t.status === filtroStatus;

    let matchData = true;
    if (dataFiltro) {
      const dataAberturaStr = t.dataHoraAbertura.split('T')[0];
      matchData = dataAberturaStr === dataFiltro;
    }

    return matchBusca && matchStatus && matchData;
  });

  // Métricas acumuladas
  const kmTotal = turnosFiltrados.reduce((acc, t) => acc + (t.kmRodados || 0), 0);
  const entregasTotal = turnosFiltrados.reduce((acc, t) => acc + (t.totalEntregasRealizadas || 0), 0);
  const trocoTotal = turnosFiltrados.reduce((acc, t) => acc + (t.trocoInicial || 0), 0);
  const turnosAtivosCount = turnos.filter((t) => t.status === 'EM_ANDAMENTO').length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Ações no TopBar */}
      <TopBarActions>
        {buscaExterno === undefined && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por entregador, placa, modelo..."
              className="w-40 sm:w-60 pl-8 pr-7 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 focus:border-blue-500 text-white placeholder-slate-400 focus:outline-none transition-all shadow-inner"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
        )}

        {onAbrirTurno && (
          <button
            onClick={onAbrirTurno}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95 shrink-0 cursor-pointer"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>Iniciar Turno</span>
          </button>
        )}
      </TopBarActions>

      {/* KPI Cards Compactos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#eaecf0] dark:bg-slate-900/90 p-3 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-blue-500" />
            KM Total Percorrido
          </span>
          <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
            {kmTotal.toLocaleString('pt-BR')} km
          </p>
        </div>

        <div className="bg-[#eaecf0] dark:bg-slate-900/90 p-3 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <PackageCheck className="w-3.5 h-3.5 text-emerald-500" />
            Entregas Realizadas
          </span>
          <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
            {entregasTotal} entregas
          </p>
        </div>

        <div className="bg-[#eaecf0] dark:bg-slate-900/90 p-3 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-amber-500" />
            Troco Concedido
          </span>
          <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
            {formatarMoeda(trocoTotal)}
          </p>
        </div>

        <div className="bg-[#eaecf0] dark:bg-slate-900/90 p-3 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-purple-500" />
            Total de Jornadas
          </span>
          <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
            {turnosFiltrados.length} registradas
          </p>
        </div>
      </div>

      {/* Filtros Secundários Rápidos */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 py-1 px-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={dataFiltro}
              onChange={(e) => setDataFiltro(e.target.value)}
              className="bg-transparent text-xs focus:outline-none"
            />
            {dataFiltro && (
              <button
                onClick={() => setDataFiltro('')}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="py-1 px-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="EM_ANDAMENTO">Em Andamento (Ativos)</option>
            <option value="FECHADO">Fechados (Concluídos)</option>
          </select>
        </div>

        {turnosAtivosCount > 0 && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-full text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {turnosAtivosCount} {turnosAtivosCount === 1 ? 'Turno Ativo' : 'Turnos Ativos'} no Momento
          </div>
        )}
      </div>

      {/* Table of Turnos */}
      <div className="bg-[#eaecf0] dark:bg-slate-900/90 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-xs overflow-hidden">
        {turnosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-700 dark:text-slate-200">Nenhuma jornada encontrada</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Ajuste os filtros de pesquisa ou inicie um novo turno para registrar as atividades.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
                  <th className="py-2 px-3">Status / Data</th>
                  <th className="py-2 px-3">Entregador</th>
                  <th className="py-2 px-3">Veículo & Placa</th>
                  <th className="py-2 px-3 text-center">Odômetro (KM)</th>
                  <th className="py-2 px-3 text-right">Troco Inicial</th>
                  <th className="py-2 px-3 text-right">Prestação / Diferença</th>
                  <th className="py-2 px-3 text-center">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                {turnosFiltrados.map((t) => {
                  const dataAberturaFmt = formatarDataHora(t.dataHoraAbertura);
                  const dataFechamentoFmt = t.dataHoraFechamento ? formatarDataHora(t.dataHoraFechamento) : 'Em Andamento';

                  return (
                    <tr key={t.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Status / Data */}
                      <td className="py-1.5 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          {t.status === 'EM_ANDAMENTO' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              EM ANDAMENTO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 w-fit">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              FECHADO
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            Início: {dataAberturaFmt}
                          </span>
                        </div>
                      </td>

                      {/* Entregador */}
                      <td className="py-1.5 px-3 font-bold text-slate-900 dark:text-white">
                        {t.entregadorNome}
                      </td>

                      {/* Veículo & Placa */}
                      <td className="py-1.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <Bike className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white text-xs block">{t.veiculoModelo}</span>
                            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                              {t.veiculoPlaca}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Odômetro */}
                      <td className="py-1.5 px-3 text-center font-mono text-xs">
                        <div>
                          <span className="text-slate-500">Inicial:</span> {t.kmInicial} km
                        </div>
                        {t.kmFinal !== undefined ? (
                          <div className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                            <span className="text-slate-500 font-normal">Final:</span> {t.kmFinal} km ({t.kmRodados} km)
                          </div>
                        ) : (
                          <div className="text-amber-600 dark:text-amber-400 text-[10px]">Em aberto</div>
                        )}
                      </td>

                      {/* Troco Inicial */}
                      <td className="py-1.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                        {formatarMoeda(t.trocoInicial)}
                      </td>

                      {/* Prestação e Diferença */}
                      <td className="py-1.5 px-3 text-right font-mono text-xs">
                        {t.status === 'FECHADO' ? (
                          <div>
                            <span className="text-slate-700 dark:text-slate-300 font-medium block">
                              {formatarMoeda(t.totalDinheiroInformado || 0)}
                            </span>
                            {t.diferencaDinheiro !== undefined && (
                              <span
                                className={`font-bold text-[10px] ${
                                  t.diferencaDinheiro === 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : t.diferencaDinheiro > 0
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {t.diferencaDinheiro === 0
                                  ? 'Exato'
                                  : t.diferencaDinheiro > 0
                                  ? `+${formatarMoeda(t.diferencaDinheiro)}`
                                  : formatarMoeda(t.diferencaDinheiro)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Aberto</span>
                        )}
                      </td>

                      {/* Observações */}
                      <td className="py-1.5 px-3 text-center">
                        {t.observacoes ? (
                          <span className="text-slate-600 dark:text-slate-300 text-xs italic block truncate max-w-xs" title={t.observacoes}>
                            {t.observacoes}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="py-2 px-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
          <span>
            Mostrando <strong>{turnosFiltrados.length}</strong> de <strong>{turnos.length}</strong> jornadas registradas
          </span>
        </div>
      </div>
    </div>
  );
};
