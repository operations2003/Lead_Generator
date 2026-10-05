import { createApp } from './app';
import { config } from './config';
import { initDb } from './db/migrate';

async function bootstrap() {
  try {
    // 1. Initialize DB & Migrations
    await initDb();

    // 2. Start Express App
    const app = createApp();
    app.listen(config.port, () => {
      console.log(`Lead Generator Backend running on http://localhost:${config.port}`);
      console.log(`Authentication endpoints available at http://localhost:${config.port}/api/v1/auth`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
