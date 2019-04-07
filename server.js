const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const state = {
  isRunning: false,
  countdown: 4,
  timer: null,
  winner: null,
  points: {
    player1: 0,
    player2: 0,
  },
  canvas: {
    width: 0,
    height: 0,
  },
  players: {},
  ball: {
    x: 0,
    y: 0,
    vx: 5,
    vy: 5,
    speed: 7,
    radius: 10,
  },
};

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.use(express.static('public'));

io.on('connection', function(socket) {
  socket.on('disconnect', function() {
    delete state.players[socket.id];
  });

  socket.on('canvasSize', function(canvas) {
    if (state.canvas.width == 0 || state.canvas.height == 0) {
      state.canvas.width = canvas.width;
      state.canvas.height = canvas.height;
    } else {
      if (canvas.width < state.canvas.width) {
        state.canvas.width = canvas.width;
      }
      if (canvas.height < state.canvas.height) {
        state.canvas.height = canvas.height;
      }
    }
    if (state.ball.x == 0 && state.ball.y == 0) {
      initBallPosition();
    }
  });

  socket.on('newPlayer', function() {
    if (Object.keys(state.players).length < 2) {
      state.players[socket.id] = {
        x: Object.keys(state.players).length < 1 ? 10 : state.canvas.width - 20,
        y: 0,
        width: 10,
        height: 150,
      };
    }
    if (Object.keys(state.players).length > 1) {
      setInterval(function() {
        roundProcess();
      }, 1000 / 60);
    }
  });

  socket.on('updatePosition', function(position) {
    state.players[socket.id].y = position;
  });

  setInterval(function() {
    io.sockets.emit('state', state);
  }, 1000 / 60);
});

http.listen(3000, function() {
  console.log('listening on *:3000');
});

function collision(ball, player) {
  player.top = player.y;
  player.bottom = player.y + player.height;
  player.left = player.x;
  player.right = player.x + player.width;

  ball.top = ball.y - ball.radius;
  ball.bottom = ball.y + ball.radius;
  ball.left = ball.x - ball.radius;
  ball.right = ball.x + ball.radius;

  return (
    player.left < ball.right &&
    player.top < ball.bottom &&
    player.right > ball.left &&
    player.bottom > ball.top
  );
}

function getCollidePoint(ball, player) {
  let collidePoint = ball.y - (player.y + player.height / 2);
  return collidePoint / (player.height / 2);
}

function initBallPosition() {
  state.ball.x = state.canvas.width / 2 - state.ball.radius;
  state.ball.y = state.canvas.height / 2 - state.ball.radius;
  state.ball.speed = 7;
  state.ball.vx = 5;
  state.ball.vy = 5;
}

function arbitrator() {
  if (state.ball.x + state.ball.radius > state.canvas.width) {
    state.points.player1 += 1;
    state.isRunning = false;
    initBallPosition();
    state.countdown = 4;
    state.timer = null;
    return;
  } else if (state.ball.x + state.ball.radius < 0) {
    state.points.player2 += 1;
    state.isRunning = false;
    initBallPosition();
    state.countdown = 4;
    state.timer = null;
    return;
  }
}

function ballPosition() {
  state.ball.x += state.ball.vx;
  state.ball.y += state.ball.vy;

  arbitrator();

  if (
    state.ball.y + state.ball.radius > state.canvas.height ||
    state.ball.y - state.ball.radius < 0
  ) {
    state.ball.vy = -state.ball.vy;
  }
}

function calculPlayersPosition() {
  for (const player in state.players) {
    if (state.players[player].y < 0) {
      state.players[player].y = 0;
    }
    if (
      state.players[player].y + state.players[player].height >
      state.canvas.height
    ) {
      state.players[player].y =
        state.canvas.height - state.players[player].height;
    }
  }
}

function countdown() {
  if (state.countdown > 0) {
    state.countdown -= 1;
    setTimeout(countdown, 1000);
  }
}

function roundProcess() {
  if (state.points.player1 > 2 || state.points.player2 > 2) {
    state.winner =
      state.points.player1 < state.points.player2 ? 'player2' : 'player1';
    state.isRunning = false;
    return;
  }
  if (!state.isRunning && !state.timer) {
    state.timer = true;
    countdown();
  } else if (!state.isRunning && state.countdown <= 0) {
    state.isRunning = true;
  } else if (state.isRunning && state.countdown <= 0) {
    ballPosition();

    calculPlayersPosition();

    let playerIDs = Object.keys(state.players);
    let player =
      state.ball.x + state.ball.radius < state.canvas.width / 2
        ? state.players[playerIDs[0]]
        : state.players[playerIDs[1]];

    if (collision(state.ball, player)) {
      let collidePoint = getCollidePoint(state.ball, player);
      let angleRad = (Math.PI / 4) * collidePoint;
      let direction =
        state.ball.x + state.ball.radius < state.canvas.width / 2 ? 1 : -1;
      state.ball.vx = direction * state.ball.speed * Math.cos(angleRad);
      state.ball.vy = state.ball.speed * Math.sin(angleRad);
      state.ball.speed += 1;
    }
  }
}
