const io = require('socket.io')();

let clientRooms = {};
let state = {};

io.on('connection', (client) => {
  client.on('newGame', handleNewGame);
  client.on('joinGame', handleJoinGame);
  client.on('startQuiz', () => startQuiz(client));

  function handleNewGame(nickName) {
    let roomName = makeid(5);
    clientRooms[client.id] = roomName;
    state[roomName] = {
      players: [
        { nickName: nickName, points: 0, id: client.id},
      ],
    };
    client.emit('gameCode', roomName);
    io.emit('playerJoined', nickName);
  }

  function handleJoinGame(roomName, nickName) {

    let numClients = state[roomName].players.length;

    if (numClients === 0) {
      client.emit('unknownCode');
      return;
    } else if (numClients >= 4) {
      client.emit('tooManyPlayers');
      return;
    }

    clientRooms[client.id] = roomName;
    state[roomName].players.push({ nickName: nickName, points: 0, id: client.id});
    client.emit('gameCode', roomName);
    io.emit('playerJoined', state[roomName].players.map(player => player.nickName)); // Send the list of all player nicknames
  }

  function startQuiz(client){
    let questions = require('./questions.json');
    let timerId;
    let currentQuestion = getRandomQuestion(questions);
    
    function sendQuestion() {
      return new Promise((resolve) => {
        if(timerId){
          clearTimeout(timerId);
        }
  
        currentQuestion = getRandomQuestion(questions);
        io.emit('question', { 
          text: currentQuestion.text, 
          options: currentQuestion.options 
        });
  
        timerId = setTimeout(sendQuestion, 140 * 1000); // 10 seconds
        resolve();
      });
    }
  
    client.on('answer', (answer) => {
      // Check if the answer is correct
      if (answer === currentQuestion.answer) {
        sendQuestion().then(() => {
          // Call the function to move the car
          client.emit('moveCar')
          client.broadcast.emit('carMoved', state[clientRooms[client.id]].players.find(player => player.id === client.id).nickName);
        });
      }
      else {
        client.emit('incorrectAnswer');
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
  let result = '';
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
console.log('Server started');
io.listen(process.env.PORT || 3000);