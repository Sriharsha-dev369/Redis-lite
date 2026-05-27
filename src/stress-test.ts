import net from "net";

const PORT = 6379;
const TOTAL_CLIENTS = 20;

function makeClient(id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ port: PORT, host: "127.0.0.1" });
    const results: string[] = [];

    socket.on("connect", () => {
      // Send PING, ECHO, and an unknown command back-to-back (pipelining)
      socket.write("*1\r\n$4\r\nPING\r\n");
      socket.write(`*2\r\n$4\r\nECHO\r\n$8\r\nclient${String(id).padStart(2, "0")}\r\n`);
      socket.write("*1\r\n$3\r\nFOO\r\n");
    });

    socket.on("data", (data) => {
      results.push(data.toString().trim());
      socket.end();
    });

    socket.on("end", () => {
      console.log(`[client ${String(id).padStart(2, "0")}] replies: ${results.join(" | ")}`);
      resolve();
    });

    socket.on("error", (err) => {
      console.error(`[client ${String(id).padStart(2, "0")}] error: ${err.message}`);
      reject(err);
    });
  });
}

const clients = Array.from({ length: TOTAL_CLIENTS }, (_, i) => makeClient(i + 1));

const start = Date.now();
Promise.all(clients).then(() => {
  console.log(`\nAll ${TOTAL_CLIENTS} clients done in ${Date.now() - start}ms`);
});
