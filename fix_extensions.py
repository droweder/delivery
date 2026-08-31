import re

def add_js_extension(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find all local imports like from './something' or from '../something'
    # and append .js if they don't have an extension
    def replacer(match):
        prefix = match.group(1)
        path = match.group(2)
        if not path.endswith('.js') and not path.endswith('.ts') and not path.endswith('.json') and not path.endswith('.css'):
            return f"{prefix}'{path}.js'"
        return match.group(0)

    new_content = re.sub(r"(import\s+.*?from\s+)['\"](\.[^'\"]+)['\"]", replacer, content)
    new_content = re.sub(r"(export\s+.*?from\s+)['\"](\.[^'\"]+)['\"]", replacer, new_content)
    # Also handle dynamic import
    new_content = re.sub(r"(import\()[\'\"](\.[^'\"]+)[\'\"](\))", lambda m: f"{m.group(1)}'{m.group(2)}.js'{m.group(3)}" if not m.group(2).endswith('.js') else m.group(0), new_content)

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

add_js_extension('server.ts')
add_js_extension('api/index.ts')
add_js_extension('src/data/initialData.ts')
add_js_extension('src/data/schemaSql.ts')
