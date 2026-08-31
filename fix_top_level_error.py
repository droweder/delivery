with open('api/index.ts', 'r') as f:
    text = f.read()

text = """
export default async function handler(req, res) {
  try {
    const serverModule = await import('../server.js');
    const app = serverModule.default;
    return app(req, res);
  } catch (e) {
    console.error("CRITICAL IMPORT ERROR", e);
    return res.status(500).json({ error: "CRITICAL IMPORT ERROR", message: e.message, stack: e.stack });
  }
}
"""

with open('api/index.ts', 'w') as f:
    f.write(text)
