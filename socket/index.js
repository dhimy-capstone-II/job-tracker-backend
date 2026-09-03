/**
 * socket/index.js — the real-time server for mock interview rooms.
 *
 * app.js calls initSocket(httpServer) once at startup.
 *
 * This file is the "signaling server" from the WebRTC design. Its job is
 * only to pass messages between people in the same room. It never touches
 * the audio itself — the audio travels browser to browser.
 *
 * Phase V1 (this file for now) handles room membership:
 *
 *   client -> voice-join        { roomId }
 *   server -> voice-room-users  { users }        (only to the person joining)
 *   server -> voice-user-joined { socketId, username }  (to everyone else)
 *   client -> voice-leave
 *   server -> voice-user-left   { socketId }
 *
 * The offer / answer / ICE candidate events come in Phase V2.
 */

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const { User } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "token";

// A room code is short and simple on purpose: it gets typed by hand and
// read out loud. Only letters, numbers and dashes are allowed.
const ROOM_ID_PATTERN = /^[A-Za-z0-9-]{4,32}$/;

// A mesh connects every peer to every other peer, so the number of
// connections grows quickly. The documentation this is based on suggests
// keeping it around four.
const MAX_ROOM_SIZE = 4;

// Read one cookie out of a raw "a=1; b=2" header.
// Written by hand so the socket layer does not need its own cookie library.
function readCookie(cookieHeader, name) {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");

    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}

// Everyone currently in a room, as plain objects the frontend can render.
function getRoomUsers(io, roomId) {
  const socketIds = io.sockets.adapter.rooms.get(roomId) || new Set();

  return [...socketIds].map((id) => {
    const socket = io.sockets.sockets.get(id);

    return {
      socketId: id,
      username: socket?.data?.username || "Unknown",
    };
  });
}

function initSocket(httpServer, frontendUrl) {
  const io = new Server(httpServer, {
    cors: {
      origin: frontendUrl,
      credentials: true,
    },
  });

  // ---------- authentication ----------
  //
  // Runs once per connection, before any event is handled. The browser
  // sends the same httpOnly cookie it uses for normal API calls, so a
  // logged-out visitor can never open a socket.

  io.use(async (socket, next) => {
    try {
      const token = readCookie(
        socket.handshake.headers.cookie,
        COOKIE_NAME,
      );

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const payload = jwt.verify(token, JWT_SECRET);
      const user = await User.findByPk(payload.sub);

      if (!user) {
        return next(new Error("Session no longer valid"));
      }

      // Remember who this socket belongs to for the rest of its life.
      socket.data.userId = user.id;
      socket.data.username = user.username;

      return next();
    } catch {
      return next(new Error("Invalid or expired token"));
    }
  });

  // ---------- connection ----------

  io.on("connection", (socket) => {
    console.log(`🔌 socket connected: ${socket.data.username}`);

    // ----- join a room -----

    socket.on("voice-join", ({ roomId } = {}) => {
      if (typeof roomId !== "string" || !ROOM_ID_PATTERN.test(roomId)) {
        return socket.emit("voice-error", {
          message: "Room codes use 4-32 letters, numbers or dashes.",
        });
      }

      // One room at a time keeps the peer bookkeeping simple.
      if (socket.data.roomId) {
        return socket.emit("voice-error", {
          message: "You are already in a room.",
        });
      }

      const existingUsers = getRoomUsers(io, roomId);

      if (existingUsers.length >= MAX_ROOM_SIZE) {
        return socket.emit("voice-error", {
          message: `This room is full (${MAX_ROOM_SIZE} people maximum).`,
        });
      }

      socket.join(roomId);
      socket.data.roomId = roomId;

      // Tell the person joining who is already here, so they can show
      // the participant list straight away.
      socket.emit("voice-room-users", { users: existingUsers });

      // Tell everyone already in the room that someone new arrived.
      // In Phase V2 this is the signal that starts a peer connection.
      socket.to(roomId).emit("voice-user-joined", {
        socketId: socket.id,
        username: socket.data.username,
      });

      console.log(
        `🎙️  ${socket.data.username} joined room ${roomId} ` +
          `(${existingUsers.length + 1} in room)`,
      );
    });

    // ----- leave a room -----

    // Shared by the explicit "leave" button and by disconnecting, so the
    // room is cleaned up the same way either time.
    function leaveRoom() {
      const roomId = socket.data.roomId;

      if (!roomId) {
        return;
      }

      socket.leave(roomId);
      socket.data.roomId = null;

      socket.to(roomId).emit("voice-user-left", {
        socketId: socket.id,
      });

      console.log(`👋 ${socket.data.username} left room ${roomId}`);
    }

    socket.on("voice-leave", leaveRoom);
    socket.on("disconnect", leaveRoom);

    // ----- WebRTC signaling relay -----
    //
    // The three events below are the actual call setup. The server only
    // passes these messages along; it never reads or stores the audio.
    //
    // Before forwarding anything we check the recipient is in the same
    // room as the sender. Without that check, someone could use their own
    // socket to push offers at any other connected user in the app.
    function relayTo(targetSocketId, eventName, payload) {
      const roomId = socket.data.roomId;
      const target = io.sockets.sockets.get(targetSocketId);

      if (!roomId || !target || target.data.roomId !== roomId) {
        return;
      }

      target.emit(eventName, {
        ...payload,
        from: socket.id,
      });
    }

    // The caller describes the call it wants to make.
    socket.on("voice-offer", ({ offer, to } = {}) => {
      if (!offer || !to) {
        return;
      }

      relayTo(to, "voice-offer", { offer });
    });

    // The callee replies with its own description.
    socket.on("voice-answer", ({ answer, to } = {}) => {
      if (!answer || !to) {
        return;
      }

      relayTo(to, "voice-answer", { answer });
    });

    // Each possible network route is sent as it is discovered, rather than
    // waiting for the whole list. This is the "trickle ICE" approach.
    socket.on("new-ice-candidate", ({ candidate, to } = {}) => {
      if (!candidate || !to) {
        return;
      }

      relayTo(to, "new-ice-candidate", { candidate });
    });
  });

  return io;
}

module.exports = { initSocket };
