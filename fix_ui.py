import re

with open('src/components/LoginScreen.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'<span[^>]*>\s*SaaS Multi-Empresas\s*</span>', '', content)
content = re.sub(r'\{/\* Supabase \+ Vercel Deployment Architecture Note \*/\}[\s\S]*?</div>\s*</div>\s*\{/\* Modal', '</div>\n      {/* Modal', content)

with open('src/components/LoginScreen.tsx', 'w') as f:
    f.write(content)
