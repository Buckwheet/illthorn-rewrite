import net from "node:net";

const server = net.createServer((socket) => {
	console.log("Client connected");

	socket.on("data", (data) => {
		console.log("Received data:", data.toString());
		console.log("Hex dump:", data.toString("hex"));
	});

	socket.on("end", () => {
		console.log("Client disconnected");
	});
});

server.listen(5555, () => {
	console.log("Server listening on port 5555");
});
