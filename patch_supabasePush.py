import re

with open('src/lib/supabasePush.ts', 'r') as f:
    content = f.read()

# Delete sendTestPushNotification function
func_pattern = r"\s*\/\/\s*-+\s*\/\/\s*ENVIAR PUSH DE TESTE OU SIMULAÇÃO\s*\/\/\s*-+\s*export async function sendTestPushNotification\([\s\S]*?return \{ sucesso: false \};\s*\}\n"
content = re.sub(func_pattern, "\n", content)

with open('src/lib/supabasePush.ts', 'w') as f:
    f.write(content)
