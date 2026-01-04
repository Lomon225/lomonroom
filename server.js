const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

// dossier public pour les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// route principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// logique Socket.io pour lomonroom
io.on('connection', (socket) => {
  console.log('Nouvelle connexion à lomonroom');

  socket.on('join-room', ({ roomCode, pseudo }) => {
    if (!roomCode || !pseudo) {
      socket.emit('error-message', 'Code de groupe et pseudo obligatoires.');
      return;
    }

    const room = io.sockets.adapter.rooms.get(roomCode);
    const nbUsers = room ? room.size : 0;

    if (nbUsers >= 10) {
      socket.emit('room-full', 'Ce salon est déjà complet (10 personnes max).');
      return;
    }

    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.pseudo = pseudo;

    socket.emit('joined', `Bienvenue dans ${roomCode}, ${pseudo} !`);
    socket.to(roomCode).emit('user-joined', `${pseudo} a rejoint le salon.`);
    console.log(`${pseudo} rejoint ${roomCode} (${nbUsers + 1} personnes)`);
  });

  socket.on('chat-message', (message) => {
    if (!socket.roomCode || !socket.pseudo) return;
    const trimmed = (message || '').trim();
    if (!trimmed) return;

    io.to(socket.roomCode).emit('chat-message', {
      pseudo: socket.pseudo,
      message: trimmed,
      time: new Date().toLocaleTimeString()
    });
  });

  socket.on('disconnect', () => {
    if (socket.roomCode && socket.pseudo) {
      socket.to(socket.roomCode).emit('user-left', `${socket.pseudo} a quitté le salon.`);
      console.log(`${socket.pseudo} a quitté ${socket.roomCode}`);
    }
  });
});

// port pour local + hébergeur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`lomonroom prêt sur le port ${PORT}`);
});
