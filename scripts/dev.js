const { spawn } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const children = [
  spawn("npm", ["start"], { cwd: path.join(root, "Backend"), stdio: "inherit", shell: true }),
  spawn("npm", ["run", "dev"], { cwd: path.join(root, "Frontend"), stdio: "inherit", shell: true }),
];

function stop() {
  for (const child of children) child.kill();
  process.exit();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
