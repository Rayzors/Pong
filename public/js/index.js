class Canvas {
  constructor(socket) {
    this.socket = socket;
    this.subscriber = [];
    this.players = [];
    this.countdown = 0;
    this.winner = null;
    this.$el = document.createElement('canvas');
    document.body.appendChild(this.$el);
    this.$el.width = window.innerWidth;
    this.$el.height = window.innerHeight;
    this.socket.emit('canvasSize', {
      width: this.$el.width,
      height: this.$el.height,
    });
    this.ctx = this.$el.getContext('2d');
    window.addEventListener('resize', this.resize);
    this.initGame();
  }

  initGame() {
    this.mouse = new Mouse();
    this.socket.emit('newPlayer');
    this.ball = new Ball(this.ctx);
    this.subscriber.push(this.ball);
    this.subscriber.forEach((sub) => sub.draw());
    window.addEventListener('mousemove', (e) => {
      const isInArray = this.players.some(
        (playerEl) => playerEl.id === this.socket.id
      );
      if (isInArray) {
        this.socket.emit(
          'updatePosition',
          e.pageY - this.players[0].height / 2
        );
      }
    });
    this.socket.on('state', (state) => {
      // console.log('state', state.points);
      for (let player in state.players) {
        const isInArray = this.players.some(
          (playerEl) => playerEl.id === player
        );
        if (!isInArray) {
          const newPlayer = new Player(
            this.ctx,
            player,
            state.players[player].x
          );
          this.players.push(newPlayer);
          this.subscriber.push(newPlayer);
        }
      }

      this.countdown = state.countdown;
      this.winner = state.winner;
      this.points = state.points;

      if (state.isRunning) {
        let count = 0;
        for (let player in state.players) {
          this.players[count].y = state.players[player].y;
          count++;
        }
        this.ball.x = state.ball.x;
        this.ball.y = state.ball.y;
        this.ball.vy = state.ball.vy;
        this.ball.vx = state.ball.vx;
        this.ball.speed = state.ball.speed;
        this.$el.width = state.canvas.width;
        this.$el.height = state.canvas.height;
      }
    });
    this.animate();
  }

  waitingForAPlayer() {
    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.$el.width, this.$el.height);
    this.ctx.fillStyle = 'white';
    this.ctx.fill();
    this.ctx.fillStyle = 'black';
    let txt = "En attente d'un joueur";
    this.ctx.font = '30px sans-serif';
    this.ctx.fillText(
      txt,
      this.$el.width / 2 - this.ctx.measureText(txt).width / 2,
      this.$el.height / 2
    );
  }

  showPoints(winner) {
    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.$el.width, this.$el.height);
    this.ctx.fillStyle = 'white';
    this.ctx.fill();
    this.ctx.fillStyle = 'black';
    let txt = `Le gagnant est ${winner} \n ${this.points.player1} - ${
      this.points.player2
    }`;
    this.ctx.font = '30px sans-serif';
    this.ctx.fillText(
      txt,
      this.$el.width / 2 - this.ctx.measureText(txt).width / 2,
      this.$el.height / 2
    );
  }

  drawCountdown() {
    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.$el.width, this.$el.height);
    this.ctx.fillStyle = 'white';
    this.ctx.fill();
    this.ctx.fillStyle = 'black';
    let txt = this.countdown;
    this.ctx.font = '100px sans-serif';
    this.ctx.fillText(
      txt,
      this.$el.width / 2 - this.ctx.measureText(txt).width / 2,
      this.$el.height / 2
    );
  }

  resize() {
    this.$el.width = window.innerWidth;
    this.$el.height = window.innerHeight;
    this.socket.emit('canvasSize', () => this.$el);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.ctx.clearRect(0, 0, innerWidth, innerHeight);

    this.subscriber.forEach((sub) => sub.draw());
    if (this.players.length > 1 && this.countdown > 0) {
      this.drawCountdown();
    }
    if (this.players.length < 2) {
      this.waitingForAPlayer();
    }
    if (this.winner) {
      this.showPoints(this.winner);
    }
  }
}

class Player {
  constructor(ctx, id, x) {
    this.ctx = ctx;
    this.id = id;
    this.x = x;
    this.y = window.innerHeight / 2;
    this.width = 10;
    this.height = 150;
  }

  draw() {
    this.ctx.beginPath();
    this.ctx.rect(this.x, this.y, this.width, this.height);
    this.ctx.fillStyle = 'black';
    this.ctx.fill();
  }
}

class Ball {
  constructor(ctx) {
    this.ctx = ctx;
    this.speed = 7;
    this.radius = 10;
    this.x = innerWidth / 2 - this.radius;
    this.y = innerHeight / 2 - this.radius;
    this.vx = 5;
    this.vy = 5;
  }

  incrementSpeed() {
    this.speed += 1.5;
  }

  draw() {
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    this.ctx.fillStyle = 'red';
    this.ctx.fill();
  }
}

class Mouse {
  constructor() {
    if (!Mouse.instance) {
      this.x = 0;
      this.y = 0;
      window.addEventListener('mousemove', (e) => this.move(e));
      Mouse.instance = this;
    }

    return Mouse.instance;
  }

  move(e) {
    this.x = e.pageX;
    this.y = e.pageY;
  }
}

(function() {
  var socket = io();
  let game = new Canvas(socket);
})();
