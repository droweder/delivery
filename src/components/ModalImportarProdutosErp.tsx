import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Layers,
  Database,
  ArrowRight,
  Info,
} from 'lucide-react';
import { CategoriaProduto, TipoVasilhame } from '../types';
import { formatarMoeda } from '../lib/thermalPrinter';

interface Props {
  aberto?: boolean;
  isOpen?: boolean;
  onFechar?: () => void;
  onClose?: () => void;
  onProdutosImportados?: () => void;
  onImportar?: (produtosImportados: any[]) => Promise<void> | void;
}

interface ItemImportacao {
  codigo?: string;
  nome: string;
  marca?: string;
  preco: number;
  unidadeMedida?: string;
  categoria?: CategoriaProduto;
  tipoVasilhame?: TipoVasilhame;
  estoqueCheio?: number;
  maisUtilizado?: boolean;
  valido: boolean;
  erro?: string;
}

const MODELO_EXEMPLO_TEXTO = `codigo;nome;marca;preco;unidadeMedida;categoria;tipoVasilhame;estoque;maisUtilizado
GAS-P13;Gás de Cozinha 13kg;Ultragaz;110.00;UN;GAS;P13;50;SIM
AGUA-20L;Água Mineral 20L Galão;Fonte Ibirá;14.00;Galão 20L;AGUA;P20L;90;SIM
BEB-HEIN-LN;Cerveja Heineken Long Neck 330ml;Heineken;7.50;UN;BEBIDAS;NENHUM;120;SIM
BEB-COCA-2L;Refrigerante Coca-Cola 2L Pet;Coca-Cola;11.50;Garrafa 2L;BEBIDAS;NENHUM;60;SIM
CONV-GELO-5K;Gelo em Cubos Filtrado 5kg;Gelo Polar;16.00;Saco 5kg;CONVENIENCIA;NENHUM;35;SIM
CONV-CARVAO-3K;Carvão Vegetal Especial Churrasco 3kg;Carvão Ipê;22.00;Saco 3kg;CONVENIENCIA;NENHUM;30;SIM`;

export const ModalImportarProdutosErp: React.FC<Props> = ({
  aberto,
  isOpen,
  onFechar,
  onClose,
  onProdutosImportados,
  onImportar,
}) => {
  const visivel = isOpen !== undefined ? isOpen : Boolean(aberto);
  const fechar = onClose || onFechar || (() => {});

  const [textoColado, setTextoColado] = useState('');
  const [itensPrevia, setItensPrevia] = useState<ItemImportacao[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [mensagemStatus, setMensagemStatus] = useState<string | null>(null);
  const [marcarTodosComoMaisUtilizados, setMarcarTodosComoMaisUtilizados] = useState(false);
  const [modoAba, setModoAba] = useState<'colar' | 'arquivo'>('colar');

  if (!visivel) return null;

  // Analisador inteligente de linhas (CSV, TSV, Ponto e Vírgula)
  const processarTextoParaItens = (texto: string) => {
    setTextoColado(texto);
    if (!texto.trim()) {
      setItensPrevia([]);
      return;
    }

    const linhas = texto
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (linhas.length === 0) {
      setItensPrevia([]);
      return;
    }

    // Detectar delimitador (; ou , ou \t)
    const primeiraLinha = linhas[0];
    let delimitador = ';';
    if (primeiraLinha.includes('\t')) delimitador = '\t';
    else if (primeiraLinha.includes(';') && !primeiraLinha.includes(',')) delimitador = ';';
    else if (primeiraLinha.includes(',') && !primeiraLinha.includes(';')) delimitador = ',';
    else if ((primeiraLinha.match(/;/g) || []).length >= (primeiraLinha.match(/,/g) || []).length) {
      delimitador = ';';
    } else {
      delimitador = ',';
    }

    // Verificar se a primeira linha é cabeçalho
    const primeiraLinhaColunas = primeiraLinha.split(delimitador).map((c) => c.trim().toLowerCase());
    const temCabecalho =
      primeiraLinhaColunas.some((c) => c.includes('nome') || c.includes('desc') || c.includes('produto') || c.includes('marca') || c.includes('preco') || c.includes('preço'));

    let indices = {
      codigo: -1,
      nome: -1,
      marca: -1,
      preco: -1,
      unidadeMedida: -1,
      categoria: -1,
      tipoVasilhame: -1,
      estoque: -1,
      maisUtilizado: -1,
    };

    if (temCabecalho) {
      primeiraLinhaColunas.forEach((col, idx) => {
        if (col.includes('cod') || col === 'id') indices.codigo = idx;
        else if (col.includes('nome') || col.includes('desc') || col.includes('prod')) indices.nome = idx;
        else if (col.includes('marca') || col.includes('fabricante')) indices.marca = idx;
        else if (col.includes('prec') || col.includes('valor') || col.includes('price')) indices.preco = idx;
        else if (col.includes('unid') || col.includes('medida') || col.includes('um') || col.includes('un')) indices.unidadeMedida = idx;
        else if (col.includes('cat') || col.includes('secao') || col.includes('grupo')) indices.categoria = idx;
        else if (col.includes('vasilhame') || col.includes('casco') || col.includes('botijao') || col.includes('galao')) indices.tipoVasilhame = idx;
        else if (col.includes('estoque') || col.includes('qtd') || col.includes('saldo')) indices.estoque = idx;
        else if (col.includes('utilizado') || col.includes('destaque') || col.includes('favorito') || col.includes('top')) indices.maisUtilizado = idx;
      });
    }

    // Se não encontrou índices pelo cabeçalho, assume ordem padrão:
    // 0: codigo, 1: nome, 2: marca, 3: preco, 4: unidade, 5: categoria, 6: vasilhame, 7: estoque
    if (indices.nome === -1) {
      indices = {
        codigo: 0,
        nome: 1,
        marca: 2,
        preco: 3,
        unidadeMedida: 4,
        categoria: 5,
        tipoVasilhame: 6,
        estoque: 7,
        maisUtilizado: 8,
      };
    }

    const linhasParaProcessar = temCabecalho ? linhas.slice(1) : linhas;

    const itens: ItemImportacao[] = linhasParaProcessar.map((linha, index) => {
      const colunas = linha.split(delimitador).map((c) => c.replace(/^["']|["']$/g, '').trim());

      const nome = indices.nome >= 0 && colunas[indices.nome] ? colunas[indices.nome] : colunas[0] || '';
      const codigo = indices.codigo >= 0 && colunas[indices.codigo] ? colunas[indices.codigo] : `ERP-${1000 + index}`;
      const marca = indices.marca >= 0 && colunas[indices.marca] ? colunas[indices.marca] : 'Conveniência';
      const unidadeMedida = indices.unidadeMedida >= 0 && colunas[indices.unidadeMedida] ? colunas[indices.unidadeMedida] : 'UN';

      const precoRaw = indices.preco >= 0 && colunas[indices.preco] ? colunas[indices.preco] : colunas[1] || '0';
      const precoLimpo = parseFloat(precoRaw.replace('R$', '').replace(/\s/g, '').replace(',', '.')) || 0;

      const catRaw = (indices.categoria >= 0 && colunas[indices.categoria] ? colunas[indices.categoria] : '').toUpperCase();
      let categoria: CategoriaProduto = 'CONVENIENCIA';
      if (catRaw.includes('GAS') || catRaw.includes('GÁS') || nome.toLowerCase().includes('gás') || nome.toLowerCase().includes('p13')) {
        categoria = 'GAS';
      } else if (catRaw.includes('AGUA') || catRaw.includes('ÁGUA') || nome.toLowerCase().includes('água') || nome.toLowerCase().includes('mineral')) {
        categoria = 'AGUA';
      } else if (
        catRaw.includes('BEB') ||
        catRaw.includes('CERV') ||
        catRaw.includes('REFRIG') ||
        nome.toLowerCase().includes('cerveja') ||
        nome.toLowerCase().includes('coca') ||
        nome.toLowerCase().includes('heineken') ||
        nome.toLowerCase().includes('amstel') ||
        nome.toLowerCase().includes('refrigerante') ||
        nome.toLowerCase().includes('vodka') ||
        nome.toLowerCase().includes('whisky')
      ) {
        categoria = 'BEBIDAS';
      }

      const vasilhameRaw = (indices.tipoVasilhame >= 0 && colunas[indices.tipoVasilhame] ? colunas[indices.tipoVasilhame] : '').toUpperCase();
      let tipoVasilhame: TipoVasilhame = 'NENHUM';
      if (vasilhameRaw.includes('P13') || nome.toLowerCase().includes('p13') || nome.toLowerCase().includes('13kg')) {
        tipoVasilhame = 'P13';
      } else if (vasilhameRaw.includes('P45') || nome.toLowerCase().includes('p45') || nome.toLowerCase().includes('45kg')) {
        tipoVasilhame = 'P45';
      } else if (vasilhameRaw.includes('P20L') || vasilhameRaw.includes('20L') || nome.toLowerCase().includes('20l') || nome.toLowerCase().includes('galão')) {
        tipoVasilhame = 'P20L';
      }

      const estRaw = indices.estoque >= 0 && colunas[indices.estoque] ? colunas[indices.estoque] : '20';
      const estoqueCheio = parseInt(estRaw, 10) || 20;

      const maisUtilizadoRaw = indices.maisUtilizado >= 0 && colunas[indices.maisUtilizado] ? colunas[indices.maisUtilizado].toUpperCase() : '';
      const maisUtilizado = maisUtilizadoRaw === 'SIM' || maisUtilizadoRaw === 'TRUE' || maisUtilizadoRaw === '1' || maisUtilizadoRaw === 'S';

      let valido = true;
      let erro: string | undefined;

      if (!nome) {
        valido = false;
        erro = 'Nome do produto ausente';
      } else if (precoLimpo <= 0) {
        valido = false;
        erro = 'Preço zerado ou inválido';
      }

      return {
        codigo,
        nome,
        marca,
        preco: precoLimpo,
        unidadeMedida,
        categoria,
        tipoVasilhame,
        estoqueCheio,
        maisUtilizado,
        valido,
        erro,
      };
    });

    setItensPrevia(itens);
  };

  const handleCarregarArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const conteudo = event.target?.result as string;
      if (conteudo) {
        processarTextoParaItens(conteudo);
        setModoAba('colar');
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob(['\uFEFF' + MODELO_EXEMPLO_TEXTO], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo_importacao_produtos_erp.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmarImportacao = async () => {
    const itensValidos = itensPrevia.filter((it) => it.valido);
    if (itensValidos.length === 0) {
      alert('Nenhum item válido encontrado para importação.');
      return;
    }

    setSalvando(true);
    try {
      const itensFormatados = itensValidos.map((it) => ({
        codigo: it.codigo,
        nome: it.nome,
        marca: it.marca || 'Conveniência',
        preco: it.preco,
        precoRecarga: it.preco,
        unidadeMedida: it.unidadeMedida || 'UN',
        categoria: it.categoria || 'CONVENIENCIA',
        tipoVasilhame: it.tipoVasilhame || 'NENHUM',
        estoqueCheio: it.estoqueCheio || 20,
        maisUtilizado: marcarTodosComoMaisUtilizados ? true : Boolean(it.maisUtilizado),
      }));

      if (onImportar) {
        await onImportar(itensFormatados);
      } else {
        const res = await fetch('/api/produtos/importar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itens: itensFormatados,
            modoSubstituir: false,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Erro ao importar produtos');
        }
      }

      setMensagemStatus(`Sucesso! ${itensFormatados.length} produtos importados no catálogo.`);
      if (onProdutosImportados) {
        onProdutosImportados();
      }

      setTimeout(() => {
        fechar();
      }, 1200);
    } catch (err: any) {
      alert('Erro na importação: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  const totalValidos = itensPrevia.filter((it) => it.valido).length;
  const totalErros = itensPrevia.filter((it) => !it.valido).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Importação de Catálogo do ERP
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/30 text-blue-200 border border-blue-400/30 uppercase">
                  Conveniência & Distribuidora
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Importe produtos com <strong>Nome, Marca, Preço, Unidade de Medida, Categoria e Estoque</strong> direto do seu sistema.
              </p>
            </div>
          </div>

          <button
            onClick={fechar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector & Presets */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-200/80 p-0.5 rounded-lg font-bold">
            <button
              onClick={() => setModoAba('colar')}
              className={`px-3 py-1 rounded-md transition-all ${
                modoAba === 'colar' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Colar Dados / Texto
            </button>
            <button
              onClick={() => setModoAba('arquivo')}
              className={`px-3 py-1 rounded-md transition-all ${
                modoAba === 'arquivo' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upload Arquivo CSV/Excel
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 transition-colors shadow-2xs"
              title="Baixar planilha modelo em formato CSV para preenchimento"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Baixar Modelo CSV</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Aba 1: Colar Texto */}
          {modoAba === 'colar' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Cole aqui as linhas copiadas do seu ERP ou Planilha (separadas por ponto e vírgula, vírgula ou Tab):
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  Formato: <code>codigo;nome;marca;preco;unidade;categoria;tipoVasilhame;estoque</code>
                </span>
              </div>
              <textarea
                rows={6}
                value={textoColado}
                onChange={(e) => processarTextoParaItens(e.target.value)}
                placeholder="Cole aqui o conteúdo preenchido com base no modelo baixado...&#10;Exemplo:&#10;GAS-P13;Gás de Cozinha 13kg;Ultragaz;110.00;UN;GAS;P13;50;SIM&#10;BEB-HEIN-6;Cerveja Heineken Pack 6 un;Heineken;45.00;Pack c/ 6;BEBIDAS;NENHUM;40;SIM"
                className="w-full font-mono text-[11px] p-3 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-800"
              />
            </div>
          )}

          {/* Aba 2: Upload Arquivo */}
          {modoAba === 'arquivo' && (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors bg-slate-50">
              <UploadCloud className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h4 className="font-bold text-slate-800 text-sm">Selecione o arquivo CSV, TSV ou TXT preenchido</h4>
              <p className="text-slate-500 text-xs mt-1 mb-3">
                Baixe o modelo CSV pelo botão acima, preencha os dados e faça o upload aqui.
              </p>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-xs transition-colors">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Escolher Arquivo do Computador</span>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,.json"
                  onChange={handleCarregarArquivo}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Prévia em Tabela dos Produtos Processados */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm">Prévia da Importação</h4>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-black text-[11px]">
                  {totalValidos} itens válidos
                </span>
                {totalErros > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-black text-[11px]">
                    {totalErros} com erro
                  </span>
                )}
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={marcarTodosComoMaisUtilizados}
                  onChange={(e) => setMarcarTodosComoMaisUtilizados(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span>Marcar todos como "Mais Utilizados" no PDV</span>
              </label>
            </div>

            {itensPrevia.length === 0 ? (
              <div className="border border-slate-200 rounded-xl p-8 text-center text-slate-400 bg-slate-50">
                <Database className="w-8 h-8 mx-auto stroke-1 mb-2 opacity-50" />
                <p className="font-medium text-slate-600">Nenhum produto na prévia.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Clique em <strong>"Baixar Modelo CSV"</strong> no topo para baixar a planilha modelo, preencha os seus produtos e faça o upload ou cole o texto.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-white font-bold sticky top-0">
                    <tr>
                      <th className="p-2.5">Código</th>
                      <th className="p-2.5">Nome do Produto</th>
                      <th className="p-2.5">Marca</th>
                      <th className="p-2.5">Preço Unit.</th>
                      <th className="p-2.5">Unidade Medida</th>
                      <th className="p-2.5">Categoria</th>
                      <th className="p-2.5">Vasilhame</th>
                      <th className="p-2.5 text-center">Destaque</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {itensPrevia.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50 transition-colors ${
                          !item.valido ? 'bg-rose-50/70 text-rose-900' : ''
                        }`}
                      >
                        <td className="p-2 font-mono font-bold text-slate-700">{item.codigo || '-'}</td>
                        <td className="p-2 font-bold text-slate-900">{item.nome}</td>
                        <td className="p-2 text-slate-600">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-semibold">
                            {item.marca || 'Conveniência'}
                          </span>
                        </td>
                        <td className="p-2 font-black text-emerald-700 whitespace-nowrap">
                          {formatarMoeda(item.preco)}
                        </td>
                        <td className="p-2 text-slate-600 font-semibold">{item.unidadeMedida || 'UN'}</td>
                        <td className="p-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                              item.categoria === 'GAS'
                                ? 'bg-amber-100 text-amber-800'
                                : item.categoria === 'AGUA'
                                ? 'bg-blue-100 text-blue-800'
                                : item.categoria === 'BEBIDAS'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {item.categoria}
                          </span>
                        </td>
                        <td className="p-2">
                          {item.tipoVasilhame && item.tipoVasilhame !== 'NENHUM' ? (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                              <Layers className="w-3 h-3" /> {item.tipoVasilhame}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {marcarTodosComoMaisUtilizados || item.maisUtilizado ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-black text-[10px]">
                              ⭐ SIM
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Não</span>
                          )}
                        </td>
                        <td className="p-2 text-center whitespace-nowrap">
                          {item.valido ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Válido
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-rose-700 font-bold"
                              title={item.erro}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" /> {item.erro}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {mensagemStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{mensagemStatus}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-slate-500 text-[11px] font-medium flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Produtos com mesmo código ou nome serão atualizados com os novos preços e estoque.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={fechar}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={salvando || totalValidos === 0}
              onClick={handleConfirmarImportacao}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
            >
              {salvando ? (
                <span>Salvando Catálogo...</span>
              ) : (
                <>
                  <span>Importar {totalValidos} Produtos no Catálogo</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
