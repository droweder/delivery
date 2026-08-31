with open('server.ts', 'r') as f:
    text = f.read()

handler = """
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled API Error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message, stack: err.stack });
  });

  // --------------------------------------------------------------------------
"""

text = text.replace("  // --------------------------------------------------------------------------\n  // VITE & STATIC SPA MIDDLEWARE", handler + "  // VITE & STATIC SPA MIDDLEWARE")

with open('server.ts', 'w') as f:
    f.write(text)
