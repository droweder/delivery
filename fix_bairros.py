import re

with open('src/components/PdvModulo.tsx', 'r') as f:
    content = f.read()

# Fix the destructured props usage
content = content.replace("...props.bairros", "...bairros")
content = content.replace("if (props.onProdutosAtualizados) props.onProdutosAtualizados();", "if (onProdutosAtualizados) onProdutosAtualizados();")

# Fix the select map
content = content.replace("{bairros.map((b)", "{[...bairros, ...bairrosExtras].map((b)")

with open('src/components/PdvModulo.tsx', 'w') as f:
    f.write(content)

