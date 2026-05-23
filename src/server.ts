import net from "net";

const PORT = 6379;

const server = net.createServer((socket) => {
  const addr = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`[+] Client connected: ${addr}`);

  socket.on("data", (data) => {
    console.log(`[>] Raw bytes from ${addr}:`, data);
    console.log(`[>] As string:`, JSON.stringify(data.toString()));
  });

  socket.on("end", () => {
    console.log(`[-] Client disconnected: ${addr}`);
  });

  socket.on("error", (err) => {
    console.error(`[!] Socket error (${addr}):`, err.message);
  });
});

server.on("error", (err) => {
  console.error("[!] Server error:", err.message);
  process.exit(1);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[*] Listening on port ${PORT}`);
});
