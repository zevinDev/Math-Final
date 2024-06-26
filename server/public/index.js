const BG_COLOUR = "#231f20";
const CAR_COLOUR = "#c2c2c2";

const socket = io(
  location.hostname === "localhost" ? "http://localhost:8080" : "https://run-math-final-0990160b5a86.herokuapp.com/",
  {
    withCredentials: true,
  },
);

socket.on("gameCode", handleGameCode);

const gameScreen = document.getElementById("gameScreen");
const initialScreen = document.getElementById("initialScreen");
const newGameBtn = document.getElementById("newGameButton");
const joinGameBtn = document.getElementById("joinGameButton");
const gameCodeInput = document.getElementById("gameCodeInput");
const nickNameInput = document.getElementById("nickNameInput");
const gameCodeDisplay = document.getElementById("gameCodeDisplay");

newGameBtn.addEventListener("click", newGame);
joinGameBtn.addEventListener("click", joinGame);

let canvas, ctx;
let playerNumber;
let gameActive = false;
let cars = [
  { x: 0, y: 100, nickname: "waiting..." },
  { x: 0, y: 200, nickname: "waiting..." },
  { x: 0, y: 300, nickname: "waiting..." },
  { x: 0, y: 400, nickname: "waiting..." },
]; // 4 cars
let playersReady = 0; // Track the number of players that have joined

function newGame() {
  socket.emit("newGame", nickNameInput.value);
  preGame();
}

function joinGame() {
  const code = gameCodeInput.value;
  const nickName = nickNameInput.value;
  socket.emit("joinGame", code, nickName);
  preGame();
}

let playerNicknames = []; // Array to store the nicknames of the players

function preGame() {
  initialScreen.style.display = "none";
  gameScreen.style.display = "block";
  gameCodeDisplay.innerText = `Game Code: ${gameCodeInput.value}`;

  // Wait for all players to join before initializing the game
  socket.on("playerJoined", (nicknames) => {
    playersReady = nicknames.length;
    playerNicknames = nicknames; // Update the list of player nicknames
    console.log(nicknames);
    updatePlayerList(); // Update the displayed list of players
  
    // Initialize the game for each player as they join
    if (!gameActive) {
      init();
    }
  
    // Start the quiz when all players have joined
    if (playersReady >= 4) {
      socket.emit("startQuiz");
    }
  });
}

function updatePlayerList() {
  for (let i = 0; i < playersReady; i++) {
    cars[i].nickname = playerNicknames[i];
  }
}

function handleGameCode(gameCode) {
  gameCodeDisplay.innerText = gameCode;
}

function init() {
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");

  canvas.width = 800; // wider canvas for cars to move
  canvas.height = 600;

  gameActive = true;
}

function draw() {
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the cars and the nicknames
  cars.forEach((car) => {
    ctx.fillStyle = CAR_COLOUR;
    ctx.fillRect(car.x, car.y, 50, 20); // Draw a simple rectangle as a car

    // Set the color and font for the nicknames
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";

    ctx.strokeStyle = "red";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(800, 0);
    ctx.lineTo(800, canvas.height);
    ctx.stroke();

    // Draw the nickname under the car
    ctx.fillText(car.nickname, car.x, car.y + 30);
  });
}

let submitA = document.getElementById("submitA");
let submitB = document.getElementById("submitB");
let submitC = document.getElementById("submitC");
let submitD = document.getElementById("submitD");
submitA.addEventListener("click", () => {
  socket.emit("answer", "A");
});
submitB.addEventListener("click", () => {
  socket.emit("answer", "B");
});
submitC.addEventListener("click", () => {
  socket.emit("answer", "C");
});
submitD.addEventListener("click", () => {
  socket.emit("answer", "D");
});

let questionElement = document.getElementById("question");
let optionsElement = document.getElementById("options");


socket.on("question", (question) => {
  document.getElementById("quizSection").style.display = "block";
  submitA.style.display = "inline-block";
  submitB.style.display = "inline-block";
  submitC.style.display = "inline-block";
  submitD.style.display = "inline-block";
  displayQuestion(question);
});

socket.on("incorrectAnswer", () => {
  // Get the quiz section element
  let quizSection = document.getElementById("quizSection");

  // Create a new paragraph element for the incorrect message
  let incorrectMessage = document.createElement("p");
  incorrectMessage.id = "incorrectMessage"; // Add an id to the incorrect message
  incorrectMessage.innerText = "Incorrect";

  // Append the incorrect message to the quiz section
  quizSection.appendChild(incorrectMessage);

  // Hide the question and options
  questionElement.style.display = "none";
  optionsElement.style.display = "none";
  submitA.style.display = "none";
  submitB.style.display = "none";
  submitC.style.display = "none";
  submitD.style.display = "none";
});

let timerId;

function displayQuestion(question) {
  // Clear any existing timer
  if (timerId) {
    clearTimeout(timerId);
    resetProgressBar();
  }

  // Remove the incorrect message if it exists
  let incorrectMessage = document.getElementById("incorrectMessage");
  if (incorrectMessage) {
    incorrectMessage.remove();
  }

  // Show the question and options
  questionElement.style.display = "block";
  optionsElement.style.display = "block";

  // Update the question text
  questionElement.innerText = question.text;
  MathJax.typeset();

  // Clear the previous options
  optionsElement.innerHTML = "";

  // Add each option to the options element
  for (let option in question.options) {
    let optionElement = document.createElement("li");
    optionElement.innerText = `${option}: ${question.options[option]}`;
    MathJax.typeset();
    optionsElement.appendChild(optionElement);
  }

  // Reset and start the progress bar
  resetProgressBar();
  setTimeout(startProgressBar, 100); // Add a delay before starting the progress bar

  // Start a new timer
  timerId = setTimeout(() => {
    // This code will run after 140 seconds
    console.log("Time is up!");
    // You can add code here to handle the end of the timer, such as moving to the next question
  }, 140 * 1000); // 140 seconds
}

function startProgressBar() {
  let progressBar = document.getElementById("progress-bar");
  // Enable the transition
  progressBar.style.transition = "width 140s linear";
  // Delay the width change by 10ms
  setTimeout(() => {
    progressBar.style.width = "0%";
  }, 10);
}

function resetProgressBar() {
  let progressBar = document.getElementById("progress-bar");
  // Disable the transition
  progressBar.style.transition = "none";
  progressBar.style.width = "100%";
}

socket.on("carMoved", (nickName) => {
  for (let i = 0; i < cars.length; i++) {
    // Check if the car's clientId matches the one received
    if (cars[i].nickname == nickName) {
      cars[i].x += 200;
      if (cars[i].x >= 800) {
        alert(`${nickName} has won the game!`);
        location.reload();
      }
    }
  }
});

// Call draw in a loop to animate the cars
function gameLoop() {
  if (!gameActive) return;
  draw();
  requestAnimationFrame(gameLoop);
}

// Start the game loop when the game starts
init();
gameLoop();