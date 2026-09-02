import re

with open('src/components/PdvModulo.tsx', 'r') as f:
    content = f.read()

# Add a local state for extra bairros
state_hook = r"  const \[sugestoesEndereco, setSugestoesEndereco\] = useState<ViaCepEndereco\[\]>\(\[\]\);"
new_state = r"  const [bairrosExtras, setBairrosExtras] = useState<BairroTaxa[]>([]);\n  const [sugestoesEndereco, setSugestoesEndereco] = useState<ViaCepEndereco[]>([]);"
content = re.sub(state_hook, new_state, content)

# Change autoCadastrarBairro
old_func = r"const autoCadastrarBairro = async \(nomeBairro: string\) => \{.*?try \{.*?const resp = await fetch\('/api/bairros'.*?if \(resp\.ok\) \{.*?const novo = await resp\.json\(\);.*?setNovoBairroId\(novo\.id\);.*?if \(props\.onProdutosAtualizados\) props\.onProdutosAtualizados\(\);.*?\}.*?\} catch \(e\) \{.*?console\.warn.*?\}\s*\}\s*\};"

new_func = """const autoCadastrarBairro = async (nomeBairro: string) => {
    if (!nomeBairro) return;
    const todosBairros = [...props.bairros, ...bairrosExtras];
    const found = todosBairros.find(
      (b) => b.nome.toLowerCase().includes(nomeBairro.toLowerCase()) || nomeBairro.toLowerCase().includes(b.nome.toLowerCase())
    );
    if (found) {
      setNovoBairroId(found.id);
    } else {
      try {
        const resp = await fetch('/api/bairros', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: nomeBairro, taxaEntrega: 5, tempoMedioMin: 20 })
        });
        if (resp.ok) {
          const novo = await resp.json();
          setBairrosExtras(prev => [...prev, novo]);
          setNovoBairroId(novo.id);
          if (props.onProdutosAtualizados) props.onProdutosAtualizados();
        }
      } catch (e) {
        console.warn("Erro ao cadastrar bairro:", e);
      }
    }
  };"""

content = re.sub(r"const autoCadastrarBairro = async \(nomeBairro: string\) => \{[\s\S]*?\}\s*\}\s*\};", new_func, content)

# Replace the dropdown mapping
old_dropdown = r"\{bairros\.map\(\(b\) => <option key=\{b\.id\} value=\{b\.id\}>\{b\.nome\}</option>\)\}"
new_dropdown = "{[...props.bairros, ...bairrosExtras].map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}"
content = content.replace(old_dropdown, new_dropdown)

# Change the form inputs classes to NOT have bg-[#eaecf0] and let tailwind handle it based on dark/light naturally or enforce white text if we want dark background
# The user wants "all fields to have the same color/style".
# Let's standardize all form fields in this modal to have `bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100`.
# Or just `bg-white border-slate-300 text-slate-900`.
# The modal has `bg-slate-50`. Let's use `bg-white border-slate-300 text-slate-900` for all of them!

def replace_input_classes(match):
    original = match.group(0)
    # Remove bg-[#eaecf0], text-slate-950, text-slate-900, border-blue-300, border-slate-300
    cleaned = re.sub(r"bg-\[#eaecf0\]|text-slate-950|text-slate-900|border-blue-300|border-slate-300", "", original)
    # Add standard class
    cleaned = cleaned.replace('className="', 'className="bg-white border-slate-300 text-slate-900 ')
    # Clean double spaces
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned

content = re.sub(r'className="w-full.*?bg-\[#eaecf0\].*?"', replace_input_classes, content)
content = re.sub(r'className="w-10.*?bg-\[#eaecf0\].*?"', replace_input_classes, content)
content = re.sub(r'className="w-full.*?bg-white.*?"', replace_input_classes, content) # Just in case

with open('src/components/PdvModulo.tsx', 'w') as f:
    f.write(content)
