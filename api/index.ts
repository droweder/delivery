let app: any;

try {
  app = require('../dist/server.cjs');
  if (app.default) app = app.default;
} catch (e: any) {
  app = (req: any, res: any) => {
    res.status(500).json({ error: "API Load Error", message: e.message, stack: e.stack });
  };
}

export default app;
