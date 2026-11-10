process.env.VERCEL = "1";
import('./server.ts').then(m => console.log("Loaded!")).catch(e => console.error(e));
