const current = process.env.APP_CURRENT || "/srv/naughty-jars/current";

module.exports = {
  apps: [{
    name: "naughty-jars-api",
    cwd: `${current}/backend`,
    script: "dist/server.js",
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    watch: false,
    wait_ready: true,
    listen_timeout: 15_000,
    kill_timeout: 12_000,
    restart_delay: 2_000,
    max_memory_restart: "300M",
    time: true,
    merge_logs: true,
    env_production: {
      NODE_ENV: "production",
      HOST: "127.0.0.1",
      PORT: "5000",
      ENV_FILE: "/etc/naughty-jars/backend.env",
    },
  }],
};
