const { ipcMain } = require('electron');
const twilio = require('twilio');
const fs = require('fs');
const https = require('follow-redirects').https;

const { config } = require('./config.js');
let numbers = require('./numbers.json');
let messages = require('./messages.json');
let images = require('./images.json');

let window = undefined;
const client = twilio(config.sid, config.token);

function downloadImage(url, sid) {
  let filename = "./images/" + sid + ".jpg";

  for ( let x in images )
    if ( filename === images[x] )
      return;

  const file = fs.createWriteStream(filename);
  const request = https.get(url, function(response) {
    if (response.statusCode !== 200) {
        return console.log(response.statusCode);
    }
    response.pipe(file);
    file.on('finish', function() {
      file.close();
    });
    images.push(filename);
    saveJson(images, './images.json');
    window.webContents.send('set-images', { images });
  }).on('error', function(err) {
    fs.unlink(filename);
    console.log(err);
  });

}

function getYesterday() {
    var dateObj = new Date();
    dateObj.setDate(dateObj.getDate() - 1);
    return dateObj;
}

function getLastDate() {
  if ( messages.length > 0 )
    return new Date(messages[0].dateSent);
  return getYesterday();
}

function loadJson(file_name) {
  let rawdata = fs.readFileSync(file_name);
  return JSON.parse(rawdata);
}

function saveJson(json, file_name) {
  let data = JSON.stringify(json);
  fs.writeFileSync(file_name, data);
}

function getMessageTime(message) {
  if (message)
    return message.dateSent;
  return getYesterday();
}

function processSet(msg) {
  let body = msg.body;
  let num = msg.from;
  let name = body.slice(5);

  if ( numbers[num] !== name ) {
    numbers[num] = name;
    saveJson(numbers, "./numbers.json");
    window.webContents.send('set-numbers', {
      numbers: numbers
    });
  }
}

function clearImages() {
  saveJson([], "./images.json" );
  window.webContents.send('set-images', {
    images: []
  });
}

function clearMessages(msg) {
  msg.body = "+message-cleared";
  saveJson([msg], "./messages.json" );
  window.webContents.send('display-messages', {
    messages: [msg]
  });
}

function processCommand(msg) {
  let body = msg.body;

  if (body.startsWith("+set"))
    return processSet(msg);

  if (body === "+clear-messages")
    return clearMessages(msg);

  if (body === "+clear-images")
    return clearImages();
}

const visible_history = config.visible_history_size;

function sendMessages() {
  let nmsgs = [];
  for ( let x in messages ) {
    if (messages[x].body[0] === '+' || messages[x].body.length === 0)
      continue;

    nmsgs.push(messages[x]);
    if (nmsgs.length >= visible_history)
      break;
  }

  window.webContents.send('display-messages', {
    messages: JSON.stringify(nmsgs)
  });
}

function fetchMedia(msg) {
  msg.media()
      .list({limit: 20})
      .then(media => media.forEach(m => {
        const url = 'https://api.twilio.com' + m.uri.replace('.json', '');
        downloadImage(url, m.sid);
      }))
      .catch(error => console.log(error))
}

function updateMessageLog(in_messages) {
  if (in_messages.length <= 1)
    return;

  if ( messages.length > 0 )
    in_messages = in_messages.filter((x) => x.sid !== messages[0].sid)

  for ( let x in in_messages )
    if (parseInt(in_messages[x].numMedia) > 0) {
      fetchMedia(in_messages[x]);
    }

  let new_messages = [...in_messages, ...messages];
  new_messages = new_messages.slice(0, config.message_history_size);
  saveJson(new_messages, "./messages.json");

  for ( let x in in_messages ) {
    if (in_messages[x].body[0] === '+') {
      processCommand(in_messages[x]);
    }
  }

  messages = new_messages;
  sendMessages();
}

function loadMessages() {
  client.messages
        .list({
           dateSentAfter: getLastDate(),
           to: config.phone,
           limit: 20
         })
        .then(msgs => updateMessageLog(msgs))
        .catch(error => console.log(error))
}

module.exports = {
  initMessageInterval: (win) => {
    window = win;
    sendMessages();
    this.intv = setInterval(() => loadMessages(), 10000);
    loadMessages();
  },
  disableMessages: () => {
    clearInterval(this.intv);
  }
};
