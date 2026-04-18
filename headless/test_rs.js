/* RS Test Harness — run with: node headless/test_rs.js
   Mocks HaxBall room API so you can test rule logic without a real room. */

var fs = require('fs');
var vm = require('vm');

// --- Mock disc state (index 0 = ball, 1+ = players/stadium discs) ---
var discs = {};
for (var i = 0; i <= 150; i++) {
  discs[i] = { x: 0, y: 0, xspeed: 0, yspeed: 0, radius: 0, cMask: null, cGroup: null };
}

// --- Mock room ---
var room = {
  getDiscProperties: function(i) {
    return discs[i] || null;
  },
  setDiscProperties: function(i, props) {
    if (!discs[i]) discs[i] = {};
    Object.assign(discs[i], props);
  },
  sendAnnouncement: function(msg, targetId, color, style, sound) {
    var hex = color != null ? '#' + color.toString(16).padStart(6, '0') : '';
    console.log('  [ANN' + (targetId != null ? ' @' + targetId : '') + '] ' + msg + (hex ? ' (' + hex + ')' : ''));
  },
  sendChat: function(msg, targetId) {
    console.log('  [CHAT' + (targetId != null ? ' @' + targetId : '') + '] ' + msg);
  },
  getPlayerList: function() { return []; },
  setPlayerTeam: function() {},
  setPlayerAdmin: function() {},
  getScores: function() { return { red: 0, blue: 0, time: 0, scoreLimit: 5, timeLimit: 7 }; },
  pauseGame: function() { console.log('  [PAUSE]'); },
  stopGame: function() { console.log('  [STOP]'); },
  startGame: function() { console.log('  [START]'); },
  getDiscCount: function() { return Object.keys(discs).length; },
  getBallPosition: function() { return { x: discs[0].x, y: discs[0].y }; }
};

// --- Load rule files into shared context ---
var context = vm.createContext({ room: room, console: console, Math: Math, Object: Object });

var ruleFiles = [
  'headless/lib/rules/rs_throw_in.js',
  'headless/lib/rules/realsoccer.js'
];
ruleFiles.forEach(function(f) {
  var code = fs.readFileSync(f, 'utf8');
  vm.runInContext(code, context);
});

// expose functions from context
var rsState = context.rsState;
var rsReset = context.rsReset;
var rsTrackTouch = context.rsTrackTouch;
var rsGameTick = context.rsGameTick;
var rsOnKickThrowIn = context.rsOnKickThrowIn;
var rsCheckThrowIn = context.rsCheckThrowIn;

// --- Helpers ---
function setBall(x, y, xspeed, yspeed) {
  discs[0] = { x: x, y: y, xspeed: xspeed || 0, yspeed: yspeed || 0 };
}

function tick(n) {
  n = n || 1;
  for (var i = 0; i < n; i++) rsGameTick(room);
}

function kick(playerId, name, team) {
  var player = { id: playerId, name: name, team: team };
  rsTrackTouch(player);
  if (rsState.kickOff) {
    rsState.kickOff = false;
    return;
  }
  rsOnKickThrowIn(room, player);
}

function state() {
  console.log('  rsState:', JSON.stringify(rsState));
  console.log('  ball:', JSON.stringify(discs[0]));
}

// --- Test scenarios ---
console.log('=== RS Test Harness ===\n');

// 1. Game start
console.log('--- 1. Game start (rsReset) ---');
rsReset(room);
state();

// 2. Kick-off clears kickOff flag
console.log('\n--- 2. First kick (kick-off by Red #1) ---');
setBall(0, 0);
kick(1, 'Alice', 1);
console.log('  kickOff after first kick:', rsState.kickOff);
state();

// 3. Normal play — ball inside field
console.log('\n--- 3. Ticking with ball inside field ---');
setBall(500, 400);
tick(5);
console.log('  throwIn:', rsState.throwIn, '(should be false)');

// 4. Ball crosses touchline (y > 600)
console.log('\n--- 4. Ball crosses touchline (y=620, x=500) ---');
kick(2, 'Bob', 1); // Red touches last
setBall(500, 620, 0, 5);
tick(1);
state();

// 5. Wrong team tries to take throw-in
console.log('\n--- 5. Wrong team (Red) kicks during Blue throw-in ---');
kick(3, 'Charlie', 1);
state();

// 6. Correct team takes throw-in
console.log('\n--- 6. Correct team (Blue) takes throw-in ---');
kick(4, 'Dave', 2);
state();

// 7. Ball crosses other touchline (y < -600)
console.log('\n--- 7. Ball crosses bottom touchline (y=-610, x=-200) ---');
kick(5, 'Eve', 2); // Blue touches last
setBall(-200, -610, 0, -3);
tick(1);
state();

// 8. Ball past goal line — should NOT be throw-in
console.log('\n--- 8. Ball past goal line (x=1200, y=620) — no throw-in ---');
// first clear any active throw-in
rsState.throwIn = false;
rsState.throwInTeam = null;
rsState.throwInPos = null;
setBall(1200, 620);
tick(1);
console.log('  throwIn:', rsState.throwIn, '(should be false — goal line, not touchline)');

console.log('\n=== Done ===');
