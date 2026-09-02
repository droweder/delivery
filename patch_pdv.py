import re

with open('src/components/PdvModulo.tsx', 'r') as f:
    content = f.read()

auto_bairro_func = """
  const autoCadastrarBairro = async (nomeBairro: string) => {
    if (!nomeBairro) return;
    const found = bairros.find(
      (b) => b.nome.toLowerCase().includes(nomeBairro.toLowerCase()) || nomeBairro.toLowerCase().includes(b.nome.toLowerCase())
    );
    if (found) {
      setNovoBairroId(found.id);
    } else {
      try {
        const resp = await fetch('/api/bairros', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: nomeBairro,
            taxaEntrega: 5,
            tempoMedioMin: 20
          })
        });
        if (resp.ok) {
          const novo = await resp.json();
          setNovoBairroId(novo.id);
          if (props.onProdutosAtualizados) props.onProdutosAtualizados(); // Refreshes app state
        }
      } catch (e) {
        console.warn("Erro ao cadastrar bairro:", e);
      }
    }
  };

"""

content = content.replace("  const handleConsultarCnpjClientePdv = async", auto_bairro_func + "  const handleConsultarCnpjClientePdv = async")

# Replace in CNPJ
content = re.sub(
    r"      if \(res\.bairro\) \{\s*const found = bairros.*?if \(found\) \{\s*setNovoBairroId\(found\.id\);\s*\}\s*\}",
    r"      if (res.bairro) { await autoCadastrarBairro(res.bairro); }",
    content,
    flags=re.DOTALL | re.MULTILINE
)

# Also in handleConsultarCepClientePdv, we need to set lat/lng if returned from API
content = re.sub(
    r"      const res = await consultarCep\(clean\);\n      setNovoCep\(res\.cepFormatado\);",
    r"      const res = await consultarCep(clean);\n      setNovoCep(res.cepFormatado);\n      if (res.lat && res.lng) {\n        setNovoLat(res.lat);\n        setNovoLng(res.lng);\n      }",
    content
)

with open('src/components/PdvModulo.tsx', 'w') as f:
    f.write(content)

