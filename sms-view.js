const { ipcRenderer } = require('electron');
const jquery = require('jquery');

let numbers = require('./numbers.json');
let images = require('./images.json');

function smsData(messages){
    jquery(".loading").remove();
    jquery(".messages").remove();
    for ( let x in messages ) {
        if ( jquery(".messages#" + messages[x].sid).length == 0) {
            const msg = messages[x];

            let span = "<span class=\"sender\">" + (numbers[msg.from] || msg.from ) + ":</span>";
            let message = "<div class=\"messages\" id=\"" + msg.sid + "\">" + span + msg.body + "</div>"

            jquery(".message-list").append( message );
        }
    }
}
let photos = jquery('.photos');
let flashInt = undefined;
function flashScreen() {
  let x = 0;
  flashInt = setInterval(() => {
    x += 1;
    if (x > 8) {
      clearInterval(flashInt);
      photos.removeClass('flash');
      return;
    }
    photos.toggleClass('flash');
  }, 250);
}

function rotateImage() {
    if (images.length === 0)
      return;

    let image = jquery(".photos .image");

    if (image.length === 0) {
      let image_url = images[0];
      let image_tag = jquery("<img class=\"image\" src=\"" + image_url + "\"/>");
      image_tag.data('index', 0);
      jquery(".photos").append(image_tag)
      return;
    }

    let id = image.data('index');
    if (id === undefined)
      id = 0;

    id += 1;
    if (id >= images.length)
      id = 0;

    let image_url = images[id];
    image.data('index', id);
    image.attr('src', image_url);
}

let time = jquery(".clock");
function updateClock() {
  if (time.length === 0)
    time = jquery(".clock");

  if (time.length > 0)
    time[0].innerHTML = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
}

ipcRenderer.on('display-messages', (event, message) => {
  smsData(JSON.parse(message.messages));
  flashScreen();
});

ipcRenderer.on('set-numbers', (event, message) => {
  numbers = message.numbers;
});

ipcRenderer.on('set-images', (event, message) => {
  images = message.images;
  flashScreen();
});

setInterval( () => {
  updateClock();
}, 1000 );
updateClock();

setInterval( () => {
  rotateImage();
}, 10000 );
rotateImage();