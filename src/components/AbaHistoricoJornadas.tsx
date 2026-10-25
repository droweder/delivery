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
} from 'lucide-react';
import { formatarMoeda, formatarDataHora } from '../lib/thermalPrinter';

interface Props {
  turnos: TurnoEntregador[];
}

export const AbaHistoricoJornadas: React.FC<Props> = ({ turnos }) => {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [dataFiltro, setDataFiltro] = useState<string>('');

  const turnosFiltrados = turnos.filter((t) => {
    const termo = busca.toLowerCase();
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Rastreabilidade e Histórico de Jornadas
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Consulte quem trabalhou em determinado dia, veículo utilizado, troco concedido e quilometragem percorrida (KM).
          </p>
        </div>

        {turnosAtivosCount > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            {turnosAtivosCount} {turnosAtivosCount === 1 ? 'Turno Ativo' : 'Turnos Ativos'} no Momento
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-blue-500" />
            KM Total Percorrido
          </span>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {kmTotal.toLocaleString('pt-BR')} km
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <PackageCheck className="w-4 h-4 text-emerald-500" />
            Entregas Realizadas
          </span>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {entregasTotal} entregas
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-amber-500" />
            Troco Concedido
          </span>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {formatarMoeda(trocoTotal)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-purple-500" />
            Total de Jornadas
          </span>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {turnosFiltrados.length} registradas
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar por entregador, modelo ou placa do veículo..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="date"
            value={dataFiltro}
            onChange={(e) => setDataFiltro(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {dataFiltro && (
            <button
              onClick={() => setDataFiltro('')}
              className="text-xs text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap hover:underline"
            >
              Limpar
            </button>
          )}
        </div>

        <div className="md:col-span-3">
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="EM_ANDAMENTO">Em Andamento (Ativos)</option>
            <option value="FECHADO">Fechados (Concluídos)</option>
          </select>
        </div>
      </div>

      {/* Table of Turnos */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {turnosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-base font-medium text-slate-700 dark:text-slate-300">Nenhuma jornada encontrada</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Ajuste os filtros de pesquisa ou inicie um novo turno para registrar as atividades.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Status / Data</th>
                  <th className="py-3.5 px-4">Entregador</th>
                  <th className="py-3.5 px-4">Veículo & Placa</th>
                  <th className="py-3.5 px-4 text-center">Odômetro (KM)</th>
                  <th className="py-3.5 px-4 text-right">Troco Inicial</th>
                  <th className="py-3.5 px-4 text-right">Prestação / Diferença</th>
                  <th className="py-3.5 px-4 text-center">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-sm text-slate-800 dark:text-slate-200">
                {turnosFiltrados.map((t) => {
                  const dataAberturaFmt = formatarDataHora(t.dataHoraAbertura);
                  const dataFechamentoFmt = t.dataHoraFechamento ? formatarDataHora(t.dataHoraFechamento) : 'Em Andamento';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                      {/* Status / Data */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {t.status === 'EM_ANDAMENTO' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 w-fit">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              EM ANDAMENTO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 w-fit">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              FECHADO
                            </span>
                          )}
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            Início: {dataAberturaFmt}
                          </span>
                        </div>
                      </td>

                      {/* Entregador */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {t.entregadorNome}
                      </td>

                      {/* Veículo & Placa */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Bike className="w-4 h-4 text-blue-500 shrink-0" />
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white text-xs">{t.veiculoModelo}</p>
                            <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                              {t.veiculoPlaca}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Odômetro */}
                      <td className="py-3.5 px-4 text-center font-mono text-xs">
                        <div>
                          <span className="text-slate-500">Inicial:</span> {t.kmInicial} km
                        </div>
                        {t.kmFinal !== undefined ? (
                          <div className="font-bold text-emerald-600 dark:text-emerald-400">
                            <span className="text-slate-500 font-normal">Final:</span> {t.kmFinal} km ({t.kmRodados} km rodados)
                          </div>
                        ) : (
                          <div className="text-amber-600 dark:text-amber-400 text-[11px]">Aguardando devolução</div>
                        )}
                      </td>

                      {/* Troco Inicial */}
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900 dark:text-white">
                        {formatarMoeda(t.trocoInicial)}
                      </td>

                      {/* Prestação e Diferença */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs">
                        {t.status === 'FECHADO' ? (
                          <div>
                            <p className="text-slate-700 dark:text-slate-300 font-medium">
                              Entregue: {formatarMoeda(t.totalDinheiroInformado || 0)}
                            </p>
                            {t.diferencaDinheiro !== undefined && (
                              <span
                                className={`font-bold text-[11px] ${
                                  t.diferencaDinheiro === 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : t.diferencaDinheiro > 0
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {t.diferencaDinheiro === 0
                                  ? 'Exato (Sem sobra/falta)'
                                  : t.diferencaDinheiro > 0
                                  ? `Sobra: +${formatarMoeda(t.diferencaDinheiro)}`
                                  : `Falta: ${formatarMoeda(t.diferencaDinheiro)}`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Aberto</span>
                        )}
                      </td>

                      {/* Observações */}
                      <td className="py-3.5 px-4 text-center text-xs text-slate-500 max-w-xs truncate">
                        {t.observacoes || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
