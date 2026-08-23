import type { Server } from "socket.io";
import { registerGameHandlers } from "./gameHandlers";
import { registerRoomHandlers } from "./roomHandlers";

export function registerSocketServer(io: Server) {
  io.on("connection", (socket) => {
    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);
  });
}
