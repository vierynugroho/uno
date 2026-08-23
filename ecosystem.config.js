// PM2 process definition for the standalone Socket.IO server (socket-server.ts).
// Usage on the VPS: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "uno-socket",
      script: "npm",
      args: "run start:socket",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: "4000",
        CLIENT_ORIGIN: "https://uno-pi-hazel.vercel.app",
      },
    },
  ],
};
