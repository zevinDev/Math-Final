const io = require("socket.io")(process.env.PORT || 3000, {
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
app.use(express.static(path.join(__dirname, "public")));
app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "public", "../../frontend/index.html"));
});
app.listen(8080, () => {
  console.log("Server successfully running on port 8080");
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
    };
    client.join(roomName); // client joins the room
    client.emit("gameCode", roomName);
    io.to(roomName).emit("playerJoined", nickName); // emit to all clients in the room
  }

  function handleJoinGame(roomName, nickName) {
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
    let currentQuestion = getRandomQuestion(questions);

    function sendQuestion() {
      return new Promise((resolve) => {
        if (timerId) {
          clearTimeout(timerId);
        }

        currentQuestion = getRandomQuestion(questions);
        io.to(roomName).emit("question", {
          text: currentQuestion.text,
          options: currentQuestion.options,
        });

        timerId = setTimeout(sendQuestion, 140 * 1000); // 10 seconds
        resolve();
      });
    }

    client.on("answer", (answer) => {
      // Check if the answer is correct
      if (answer === currentQuestion.answer) {
        sendQuestion().then(() => {
          // Call the function to move the car
          io.to(roomName).emit(
            "carMoved",
            state[roomName].players.find((player) => player.id === client.id)
              .nickName,
          );
        });
      } else {
        client.emit("incorrectAnswer");
      }
    });

    sendQuestion();
  }

  function getRandomQuestion(questions) {
    let randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
  }
});

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
