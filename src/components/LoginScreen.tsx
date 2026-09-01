import React, { useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Empresa, Usuario } from '../types';

interface LoginScreenProps {
  onLoginSucesso: (usuario: Usuario, empresa?: Empresa | null) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSucesso }) => {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  // Modal / Estado Esqueci Senha
  const [modalEsqueciAberto, setModalEsqueciAberto] = useState(false);
  const [emailRecuperacao, setEmailRecuperacao] = useState('');
  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false);
  const [msgSucessoRecuperacao, setMsgSucessoRecuperacao] = useState<string | null>(null);

  const handleSubmeterLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!login.trim()) {
      setErroMsg('Por favor, informe seu login ou e-mail.');
      return;
    }

    setCarregando(true);
    setErroMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: login.trim(), senha: senha.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao autenticar.');
      }

      onLoginSucesso(data.usuario, data.empresa);
    } catch (err: any) {
      setErroMsg(err.message || 'Erro ao realizar login.');
    } finally {
      setCarregando(false);
    }
  };

  const handleEnviarEsqueciSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRecuperacao.trim()) return;

    setEnviandoRecuperacao(true);
    try {
      const res = await fetch('/api/auth/esqueci-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailRecuperacao.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao solicitar recuperação.');

      setMsgSucessoRecuperacao(data.mensagem);
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar e-mail de recuperação.');
    } finally {
      setEnviandoRecuperacao(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Glow Effects Background */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 shadow-xl shadow-blue-500/20 mb-3 border border-blue-400/30">
            <Flame className="w-8 h-8 text-amber-300 drop-shadow" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            Delivery
            
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Plataforma Integrada de Gestão de Entregas, PDV Rápido e Logística em Tempo Real
          </p>
        </div>

        {/* Card Principal de Login */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-2xl rounded-3xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-black text-white">Acessar Conta</h2>
              <p className="text-xs text-slate-400">Entrada única para Super Admin e Empresas</p>
            </div>
            <div className="p-2 bg-slate-800 rounded-xl text-blue-400 border border-slate-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          {erroMsg && (
            <div className="mb-5 p-3.5 bg-red-950/60 border border-red-800/80 rounded-2xl text-red-300 text-xs font-semibold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-ping" />
              <span>{erroMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmeterLogin} className="space-y-4">
            {/* Input E-mail de Acesso */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>E-mail de Acesso</span>
                <span className="text-[10px] text-blue-400 font-normal">Supabase Auth</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoComplete="email"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="ex: admin@empresa.com.br"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Input Senha */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Senha ou PIN
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setEmailRecuperacao(login.includes('@') ? login : '');
                    setModalEsqueciAberto(true);
                    setMsgSucessoRecuperacao(null);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold hover:underline transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha ou PIN"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  title={mostrarSenha ? 'Ocultar senha' : 'Ver senha'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors"
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={carregando}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:scale-[0.99] text-white font-black text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {carregando ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Entrar no Sistema</span>
                </>
              )}
            </button>
          </form>
        </div>

        </div>
      {/* Modal Esqueci Minha Senha */}
      {modalEsqueciAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Recuperar Senha</h3>
                  <p className="text-xs text-slate-400">Restauração de acesso</p>
                </div>
              </div>
            </div>

            {msgSucessoRecuperacao ? (
              <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-2xl text-emerald-200 text-xs space-y-3">
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>E-mail de recuperação enviado!</span>
                </div>
                <p className="leading-relaxed">{msgSucessoRecuperacao}</p>
                <button
                  type="button"
                  onClick={() => {
                    setModalEsqueciAberto(false);
                    setMsgSucessoRecuperacao(null);
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all"
                >
                  Voltar ao Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnviarEsqueciSenha} className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Informe o e-mail cadastrado na sua conta. Nós enviaremos um link seguro para você
                  definir uma nova senha imediatamente.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Seu E-mail Cadastrado
                  </label>
                  <input
                    type="email"
                    required
                    value={emailRecuperacao}
                    onChange={(e) => setEmailRecuperacao(e.target.value)}
                    placeholder="ex: seu.email@empresa.com.br"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalEsqueciAberto(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={enviandoRecuperacao}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
                  >
                    {enviandoRecuperacao ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <span>Enviar Link de Recuperação</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
