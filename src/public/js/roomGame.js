$(document).ready(async function () {
  const socket = io();
  setSocketListeners();
  let user = null;
  let rooms = [];
  let dragElement = null;

  try {
    user = getUserFromLocalStorage();
    rooms = await getRooms();
    if (!rooms || !rooms.length) {
      await createFirstTimeRooms();
    }
  } catch (error) {
    console.log(error);
    alert('Error al solicitar los datos del usuario');
    return;
  }

  if (user) {
    renderUser(user);
  }

  if (rooms && rooms.length) {
    renderRooms(rooms);
    renderPlayers(rooms);
  }
  
  // FUNCIONES API GET

  function getUserFromLocalStorage() {
    const user = localStorage.getItem('user');
    if (user) {
      return JSON.parse(user);
    }
    return null;
  }

  async function getUser(id) {
    const response = await fetch(`http://localhost:3000/api/users/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    return response.json();
  }

  async function getRooms() {
    const response = await fetch('http://localhost:3000/api/rooms', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    return response.json();
  }

  async function getRoomById(id) {
    let room = null;
    try {
      room = await getRoom(id);
      return room;
    } catch (error) {
      console.log(error);
      alert('Error al solicitar los datos del usuario');
      return null;
    }
  }

  async function getRoom(id) {
    const response = await fetch(`http://localhost:3000/api/rooms/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    return response.json();
  }

  async function updateRoom(room) {
    const response = await fetch(
      `http://localhost:3000/api/rooms/${room._id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(room),
      }
    );
    return response.json();
  }

  async function createRoom(name) {
    const room = {
      name,
      users: [],
      state: '¡Oops! Aún no hay ningún jugador en esta sala...',
      game: null,
    };

    await fetch('http://localhost:3000/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(room),
    });
  }

  async function createGame(room) {
    const game = {
      playersData: getPlayersData(room),
      turn: null,
      roomId: room._id,
    };

    const response = await fetch('http://localhost:3000/api/games', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(game),
    });
    return response.json();
  }

  async function updateGame(room) {
    const game = {
      playersData: getPlayersData(room),
      turn: null,
    };

    const response = await fetch(
      `http://localhost:3000/api/games/${room.game}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(game),
      }
    );
    return response.json();
  }

  function getPlayersData(room) {
    const playersData = [];
    if (room.users.length) {
      room.users.forEach(user => {
        playersData.push({ playerId: user, points: 0, state: 'Esperando' });
      });
    }
    return playersData;
  }

  // RENDER FUNCTIONS

  function renderUser(user) {
    paintUserLogo(user);
    paintUserName(user);
  }

  function renderRooms(rooms) {
    rooms.forEach(room => {
      const row = getRowSection(room);
      row.on('dragenter', handleDragEnter);
      row.on('dragleave', handleDragLeave);
      row.on('dragover', handleDragOver);
      row.on('drop dragdrop', handleDrop);
      const nameSection = getRoomNameSection(room);
      row.append(nameSection);
      const playerSection = getRoomPlayersSection();
      row.append(playerSection);
      const stateSection = getRoomStateSection(room);
      row.append(stateSection);
      $(row).appendTo('.rooms-container');
    });
  }

  async function renderPlayers(rooms) {
    for (const room of rooms) {
      const roomRow = $(`[data-room-id=${room._id}]`);
      if (roomRow) {
        const playersContainer = $(roomRow).children('.players-container');
        $(playersContainer).html('');
        if (room.users.length) {
          for (const id of room.users) {
            const user = await getUser(id);
            if (playersContainer) {
              const image = $('<img>', {
                class: 'user-logo img-thumbnail',
                src: user.image,
              });
              $(image).appendTo(playersContainer);
            }
          }
        }
      }
    }
  }

  // PAINT FUNCTIONS

  function paintUserLogo(user) {
    const imageList = document.querySelectorAll('.user-logo');

    if (imageList.length) {
      const imageElement = imageList[0];
      imageElement.setAttribute('src', user.image);
      imageElement.addEventListener('dragstart', handleImageDragStart);
      imageElement.addEventListener('dragend', handleImageDragStop);
    }
  }

  function paintUserName(user) {
    const userSpans = document.querySelectorAll('.user-name');
    if (userSpans.length) {
      const spanElement = userSpans[0];
      spanElement.textContent = user.name;
    }
  }

  function getRowSection(room) {
    return $('<div>', { class: 'row sala-item draggable', 'data-room-id': room._id });
  }

  function getRoomNameSection(room) {
    const $div = $('<div>', { class: 'col-4' })
      .append('<span>')
      .text(room.name);
    return $div;
  }

  function getRoomPlayersSection() {
    return $('<div>', { class: 'col-4 players-container flex' });
  }

  function getRoomStateSection(room) {
    const $div = $('<div>', { class: 'col-4' });
    return $div.append('<span>').text(room.state);
  }

  // LOGICA
  async function addUserToRoom(room) {
    if (user && !room.users.includes(user._id)) {
      try {
        room.users.push(user._id);
        return await updateRoom(room);
      } catch (error) {
        console.error(error);
        alert('Error al actualizar la sala');
        return null;
      }
    } else {
      alert('El usuario ya se encuentra registrado en la sala');
    }
  }

  // INTERACCIONES EVENTOS

  function handleImageDragStart(e) {
    dragElement = $(this).clone();
    $(dragElement).attr('data-user-id', user._id);
    this.style.opacity = '0.4';
  }

  function handleImageDragStop(e) {
    this.style.opacity = '1';
  }

  function handleDragEnter(e) {
    e.preventDefault();
    this.classList.add('over');
  }

  function handleDragLeave(e) {
    e.preventDefault();
    this.classList.remove('over');
  }

  function handleDragOver(e) {
    this.classList.add('over');
    e.preventDefault();
  }

  async function handleDrop(e) {
    e.stopPropagation();
    e.preventDefault();
    this.classList.remove('over');
    const roomId = $(this).attr('data-room-id');
    const room = await getRoomById(roomId);
    if (!room) {
      alert('Se No existe la sala.');
    } else if (room.users && room.users.length >= 4) {
      alert('Se ha alcanzado el máximo de usuarios por sala.');
    } else {
      const updatedRoom = await addUserToRoom(room);
      if (updatedRoom) {
        const playersContainerElement = $(this).children('.players-container');
        $(dragElement).appendTo(playersContainerElement);
        localStorage.setItem('favouriteRoom', room._id);

        // TODO ACTULIZACION ESTADO ROOM
        let game = null;
        if (!updatedRoom.game) {
          game = await createGame(room);
        } else {
          game = await updateGame(room);
        }

        setTimeout(() => {
          window.location.replace(`/play?game=${game._id}`);
        }, 1500);
      }
    }
  }

  // SOCKET
  function setSocketListeners() {
    socket.on('playerOut', async () => {
      rooms = await getRooms();
      if (rooms && rooms.length) {
        renderPlayers(rooms);
      }
    });

    socket.on('playerIn', async () => {
      rooms = await getRooms();
      if (rooms && rooms.length) {
        renderPlayers(rooms);
      }
    });
  }

  // HELPERS
  async function createFirstTimeRooms() {
    const roomsToCreate = 4;
    for (let idx = 0; idx < roomsToCreate; idx++) {
      const name = `Sala ${idx}`;
      await createRoom(name);
    }
  }
});
