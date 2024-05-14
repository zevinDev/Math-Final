const io = require("socket.io")(3000, {
  cors: {
    origin:
      "https://run-math-final-0990160b5a86.herokuapp.com:8080/",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
let clientRooms = {};
let state = {};
const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 8080;
app.use(express.static(path.join(__dirname, "public")));
app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, '/public', "index.html"));
});
app.listen(PORT, () => {
  console.log(`Server successfully running on port ${PORT}`);
});

io.on("connection", (client) => {
  client.on("newGame", handleNewGame);
  client.on("joinGame", handleJoinGame);
  client.on("startQuiz", () => startQuiz(client));

  function handleNewGame(nickName) {
    let roomName = makeid(5);
    clientRooms[client.id] = roomName;
    state[roomName] = {
      players: [{ nickName: nickName, points: 0, id: client.id }],
      answers: {}, // Initialize the answers field
    };
    client.join(roomName); // client joins the room
    client.emit("gameCode", roomName);
    io.to(roomName).emit("playerJoined", state[roomName].players.map((player) => player.nickName)); // emit to all clients in the room
  }

  function handleJoinGame(roomName, nickName) {
    if (!state[roomName]) {
      client.emit("unknownCode");
      return;
    }
  
    let numClients = state[roomName].players.length;
  
    if (numClients === 0) {
      client.emit("unknownCode");
      return;
    } else if (numClients >= 4) {
      client.emit("tooManyPlayers");
      return;
    }

    clientRooms[client.id] = roomName;
    client.join(roomName); // client joins the room
    state[roomName].players.push({
      nickName: nickName,
      points: 0,
      id: client.id,
    });
    state[roomName].answers = {}; // Reset the answers field
    client.emit("gameCode", roomName);
    io.to(roomName).emit(
      "playerJoined",
      state[roomName].players.map((player) => player.nickName),
    ); // emit to all clients in the room
  }

  function startQuiz(client) {
    let roomName = clientRooms[client.id];
    let questions = require("./questions.json");
    let timerId;
  
    function sendQuestion() {
      return new Promise((resolve) => {
        state[roomName].answers = {}; // Reset the answers field
  
        if (timerId) {
          clearTimeout(timerId);
        }
  
        state[roomName].currentQuestion = getRandomQuestion(questions);
        io.to(roomName).emit("question", {
          text: state[roomName].currentQuestion.text,
          options: state[roomName].currentQuestion.options,
        });
  
        timerId = setTimeout(sendQuestion, 140 * 1000); // 10 seconds
        resolve();
      });
    }
  
    client.on("answer", (answer) => {
      // Store the player's answer
      state[roomName].answers[client.id] = answer;
  
      // Check if the answer is correct
      if (answer === state[roomName].currentQuestion.answer) {
        // If the answer is correct, move the player and send a new question
        movePlayer(client.id);
        sendQuestion();
      } else {
        // Check if all players have answered
        let allPlayersAnswered = Object.keys(state[roomName].answers).length === state[roomName].players.length;
  
        if (allPlayersAnswered) {
          // Check if all answers are incorrect
          let allAnswersIncorrect = Object.values(state[roomName].answers).every(a => a !== state[roomName].currentQuestion.answer);
  
          if (allAnswersIncorrect) {
            // If all answers are incorrect, send a new question
            sendQuestion();
          }
        } else {
          client.emit("incorrectAnswer");
        }
      }
    });
  
    // Start the quiz by sending the first question
    sendQuestion();
  }

  function getRandomQuestion(questions) {
    let randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
  }
});

function movePlayer(playerId) {
  let roomName = clientRooms[playerId];
  let player = state[roomName].players.find((player) => player.id === playerId);
  player.points++;
  io.to(roomName).emit("carMoved", player.nickName);
}

function makeid(length) {
  let result = "";
  let characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}