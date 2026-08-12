// pm2 config for VPS deploy (same pattern as smallpdf):
//   cd frontend && npm run build   (build first!)
//   pm2 start ecosystem.config.js
//   pm2 save
module.exports = {
  apps: [
    {
      name: 'showsure-backend',
      cwd: './backend',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5055,
        // Set real values in backend/.env (dotenv loads it):
        // JWT_SECRET, TWILIO_*, SQUARE_*, FRONTEND_URL=https://yourdomain.com
      },
    },
    {
      name: 'showsure-frontend',
      cwd: './frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      env: {
        NODE_ENV: 'production',
        BACKEND_URL: 'http://localhost:5055',
      },
    },
  ],
};
