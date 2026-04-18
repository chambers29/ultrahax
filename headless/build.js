const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOM_SCRIPT_PATH = path.join(__dirname, 'room.js');
const LIB_DIR = path.join(__dirname, 'lib');
const GENERATED_STADIUMS_DIR = path.join(__dirname, '..', 'data', 'generated_stadiums');
const OUTPUT_DIR = path.join(__dirname, 'dist');

function discoverStadiums() {
  if (!fs.existsSync(GENERATED_STADIUMS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(GENERATED_STADIUMS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => ({
      name: path.basename(entry.name, '.json'),
      filePath: path.join(GENERATED_STADIUMS_DIR, entry.name),
    }));
}

function askQuestion(promptText) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function chooseStadium() {
  const stadiums = discoverStadiums();

  if (stadiums.length === 0) {
    console.log('No stadiums found in ' + GENERATED_STADIUMS_DIR);
    console.log('Building without custom stadium (will use default Big).\n');
    return null;
  }

  console.log('\nAvailable stadiums:');
  stadiums.forEach((stadium, index) => {
    console.log(`  ${index + 1}. ${stadium.name}`);
  });

  const selection = await askQuestion('\nChoose stadium number (or Enter for default): ');

  if (!selection) {
    return null;
  }

  const index = Number.parseInt(selection, 10);
  if (Number.isInteger(index) && index >= 1 && index <= stadiums.length) {
    return stadiums[index - 1];
  }

  console.log('Invalid selection, building without custom stadium.');
  return null;
}

function cleanStadium(obj) {
  if (Array.isArray(obj)) {
    return obj.map(cleanStadium);
  }
  if (obj !== null && typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === '_data' || key === '_selected') continue;
      const cleanedValue = cleanStadium(value);
      if (cleanedValue !== null) {
        cleaned[key] = cleanedValue;
      }
    }
    return cleaned;
  }
  return obj;
}

function collectJsFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  const results = [];
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

function bundleLib() {
  const files = collectJsFiles(LIB_DIR);
  if (files.length === 0) return '';

  return files
    .map((filePath) => {
      const relPath = path.relative(LIB_DIR, filePath).replace(/\\/g, '/');
      const content = fs.readFileSync(filePath, 'utf8').trimEnd();
      return `// --- ${relPath} ---\n${content}`;
    })
    .join('\n\n');
}

function build(stadium) {
  let script = fs.readFileSync(ROOM_SCRIPT_PATH, 'utf8');

  const libBundle = bundleLib();
  script = script.replace('// __LIB_MODULES__', libBundle);

  if (stadium) {
    const raw = JSON.parse(fs.readFileSync(stadium.filePath, 'utf8'));
    const cleaned = cleanStadium(raw);
    const stadiumContent = JSON.stringify(cleaned);
    script = script.replace(
      "var STADIUM_CONTENT = '__STADIUM_CONTENT__';",
      'var STADIUM_CONTENT = ' + JSON.stringify(stadiumContent) + ';'
    );
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, 'room.js');
  fs.writeFileSync(outputPath, script, 'utf8');

  console.log(`\nBuild complete: ${path.relative(process.cwd(), outputPath)}`);
  console.log(`Stadium: ${stadium ? stadium.name : 'default (Big)'}`);
  console.log('\nPaste the contents of that file into the browser console at:');
  console.log('https://html5.haxball.com/headless');
}

async function main() {
  const stadium = await chooseStadium();
  build(stadium);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
