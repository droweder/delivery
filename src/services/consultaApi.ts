// Serviço de Consulta de CNPJ e CEP / Endereços
// Conecta com os endpoints do backend (/api/consulta/*) que integram com BrasilAPI, ReceitaWS e ViaCEP

export interface DadosCnpjResponse {
  sucesso: boolean;
  cnpj: string;
  cnpjFormatado: string;
  razaoSocial: string;
  nomeFantasia: string;
  telefone?: string;
  email?: string;
  cep?: string;
  cepFormatado?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  situacao?: string;
  cnae?: string;
  abertura?: string;
  mensagem?: string;
}

export interface DadosCepResponse {
  sucesso: boolean;
  localizado?: boolean;
  cep: string;
  cepFormatado: string;
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  complemento?: string;
  aviso?: string;
  lat?: number;
  lng?: number;
  mensagem?: string;
}

/**
 * Remove qualquer caractere não numérico
 */
export function apenasDigitos(valor: string = ''): string {
  return valor.replace(/\D/g, '');
}

/**
 * Formata CNPJ: 00.000.000/0001-00
 */
export function formatarCnpj(valor: string = ''): string {
  const digitos = apenasDigitos(valor).slice(0, 14);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 5) return `${digitos.slice(0, 2)}.${digitos.slice(2)}`;
  if (digitos.length <= 8) return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5)}`;
  if (digitos.length <= 12) return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8)}`;
  return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`;
}

/**
 * Formata CPF ou CNPJ dependendo do tamanho
 */
export function formatarCpfCnpj(valor: string = ''): string {
  const digitos = apenasDigitos(valor);
  if (digitos.length <= 11) {
    // CPF: 000.000.000-00
    if (digitos.length <= 3) return digitos;
    if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
    if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9, 11)}`;
  }
  return formatarCnpj(digitos);
}

/**
 * Formata CEP: 00000-000
 */
export function formatarCep(valor: string = ''): string {
  const digitos = apenasDigitos(valor).slice(0, 8);
  if (digitos.length <= 5) return digitos;
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

/**
 * Formata Telefone: (00) 0000-0000 ou (00) 00000-0000
 */
export function formatarTelefone(valor: string = ''): string {
  const digitos = apenasDigitos(valor).slice(0, 11);
  if (digitos.length <= 2) return digitos ? `(${digitos}` : '';
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

/**
 * Consulta dados de CNPJ no backend (BrasilAPI + ReceitaWS)
 */
export async function consultarCnpj(cnpj: string): Promise<DadosCnpjResponse> {
  const clean = apenasDigitos(cnpj);
  if (clean.length !== 14) {
    throw new Error('CNPJ deve conter exatamente 14 dígitos.');
  }

  const response = await fetch(`/api/consulta/cnpj/${clean}`);
  const data = await response.json();

  if (!response.ok || !data.sucesso) {
    throw new Error(data.mensagem || data.error || 'Não foi possível consultar os dados do CNPJ na Receita Federal.');
  }

  return data;
}

/**
 * Consulta dados de CEP no backend (BrasilAPI + ViaCEP)
 */
export async function consultarCep(cep: string): Promise<DadosCepResponse> {
  const clean = apenasDigitos(cep);
  if (clean.length !== 8) {
    throw new Error('CEP deve conter exatamente 8 dígitos.');
  }

  const response = await fetch(`/api/consulta/cep/${clean}`);
  const data = await response.json();

  if (!response.ok || !data.sucesso) {
    throw new Error(data.mensagem || data.error || 'Não foi possível localizar o endereço para este CEP.');
  }

  return data;
}

/**
 * Identifica o tipo do documento digitado
 */
export function tipoDocumento(doc: string = ''): 'CNPJ' | 'CPF' | 'INCOMPLETO' | 'VAZIO' {
  const clean = apenasDigitos(doc);
  if (!clean) return 'VAZIO';
  if (clean.length === 14) return 'CNPJ';
  if (clean.length === 11) return 'CPF';
  return 'INCOMPLETO';
}

export function isCnpj(doc: string = ''): boolean {
  return apenasDigitos(doc).length === 14;
}

export function isCpf(doc: string = ''): boolean {
  return apenasDigitos(doc).length === 11;
}

export function isCepValido(cep: string = ''): boolean {
  return apenasDigitos(cep).length === 8;
}

export interface ViaCepEndereco {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
}

export async function buscarEnderecosPorRua(uf: string, cidade: string, rua: string): Promise<ViaCepEndereco[]> {
  if (!uf || uf.length !== 2 || !cidade || rua.length < 3) return [];
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${uf}/${encodeURIComponent(cidade)}/${encodeURIComponent(rua)}/json/`);
    if (!response.ok) return [];
    const data = await response.json();
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error) {
    console.warn("Erro ao buscar endereços viaCEP:", error);
    return [];
  }
}
