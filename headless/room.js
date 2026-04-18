/* HaxBall Headless Host — browser script
   Paste into console at https://html5.haxball.com/headless
   Or use: node headless/build.js to generate with stadium embedded */

// __STADIUM_CONTENT__ is replaced by build.js with actual stadium JSON string
var STADIUM_CONTENT = '__STADIUM_CONTENT__';

var ROOM_CONFIG = {
  roomName: 'PSG Real Soccer',
  maxPlayers: 20,
  noPlayer: true,
  public: false,
  token: 'thr1.AAAAAGndEf5G9mqMUJtvqw.iORBu_iyxcc'
};

// __LIB_MODULES__

var room = HBInit(ROOM_CONFIG);

if (STADIUM_CONTENT !== '__STADIUM_CONTENT__') {
  room.setCustomStadium(STADIUM_CONTENT);
  console.log('Custom stadium loaded.');
} else {
  room.setDefaultStadium('Big');
  console.log('Using default stadium: Big');
}

room.setScoreLimit(5);
room.setTimeLimit(7);
room.setTeamsLock(false);

room.onRoomLink = function(url) {
  console.log('Room link: ' + url);
};

room.onPlayerJoin = function(player) {
  room.sendAnnouncement('Welcome ' + player.name + '!', player.id, 0x00FF00, 'bold', 1);
  updateAdmins(room);
};

room.onPlayerLeave = function() {
  updateAdmins(room);
};

room.onPlayerChat = function(player, message) {
  if (message.startsWith('!')) {
    return handleCommand(room, player, message);
  }
  return true;
};

room.onTeamVictory = function(scores) {
  var winner = scores.red > scores.blue ? 'Red' : 'Blue';
  room.sendAnnouncement(winner + ' team wins!', null, 0xFFFF00, 'bold', 2);
};

room.onGameStart = function() {
  rsReset(room);
};

room.onGameStop = function() {
  rsReset(room);
};

room.onPlayerBallKick = function(player) {
  rsTrackTouch(player);
  if (rsState.kickOff) {
    rsState.kickOff = false;
    return;
  }
  rsOnKickThrowIn(room, player);
};

room.onGameTick = function() {
  rsGameTick(room);
};

console.log('Room is ready.');
