const fs = require('fs');
const path = require('path');
const readline = require('readline');
const yaml = require('js-yaml');

const ARRAY_FIELDS = new Set(['cMask', 'cGroup']);
const GENERATED_STADIUMS_DIR = path.join(__dirname, 'data/generated_stadiums');
const TEMPLATES_DIR = path.join(__dirname, 'data/final_templates');
const ROOT_WRAPPER_KEYS = new Set(['StadiumObject', 'stadium', 'stadiumObject']);
const OBJECT_FIELDS = new Set(['bg', 'traits', 'playerPhysics', 'ballPhysics']);
const LIST_FIELDS = new Set([
  'vertexes',
  'segments',
  'goals',
  'discs',
  'planes',
  'joints',
  'redSpawnPoints',
  'blueSpawnPoints'
]);

function printUsage() {
  console.log('Usage: node stadium_generator.js [input.yaml|template-name] [output.json]');
  console.log(`Templates directory: ${path.relative(process.cwd(), TEMPLATES_DIR)}`);
}

function askQuestion(promptText) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function stripLeadingLabel(source) {
  return source
    .replace(/^\s*#\s*StadiumObject\s*\r?\n/i, '')
    .replace(/^\s*StadiumObject\s*\r?\n/i, '');
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function collapseKeyValueList(value) {
  if (!Array.isArray(value)) {
    return value;
  }

  const canCollapse = value.every((entry) => isPlainObject(entry) && Object.keys(entry).length === 1);
  if (!canCollapse) {
    return value;
  }

  return value.reduce((accumulator, entry) => {
    const [key] = Object.keys(entry);
    accumulator[key] = entry[key];
    return accumulator;
  }, {});
}

function unwrapRootObject(parsed) {
  if (!isPlainObject(parsed)) {
    return parsed;
  }

  const keys = Object.keys(parsed);
  if (keys.length !== 1) {
    return parsed;
  }

  const [onlyKey] = keys;
  if (!ROOT_WRAPPER_KEYS.has(onlyKey)) {
    return parsed;
  }

  return parsed[onlyKey];
}

function normalizeValue(key, value) {
  const collapsedValue = OBJECT_FIELDS.has(key) ? collapseKeyValueList(value) : value;

  if (ARRAY_FIELDS.has(key) && typeof collapsedValue === 'string') {
    return [collapsedValue];
  }

  if (Array.isArray(collapsedValue)) {
    return collapsedValue.map((item) => normalizeUnknown(item));
  }

  if (isPlainObject(collapsedValue)) {
    return normalizeObject(collapsedValue);
  }

  return collapsedValue;
}

function normalizeUnknown(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeUnknown(item));
  }

  if (isPlainObject(value)) {
    return normalizeObject(value);
  }

  return value;
}

function normalizeObject(objectValue) {
  const normalized = {};

  for (const [key, value] of Object.entries(objectValue)) {
    normalized[key] = normalizeValue(key, value);
  }

  return normalized;
}

function applyTopLevelDefaults(stadium) {
  for (const field of OBJECT_FIELDS) {
    if (stadium[field] === undefined || stadium[field] === null) {
      stadium[field] = {};
    }
  }

  for (const field of LIST_FIELDS) {
    if (!Array.isArray(stadium[field])) {
      stadium[field] = [];
    }
  }

  // Extract goal entries (have 'team' + 'p0'/'p1') from segments into goals
  if (Array.isArray(stadium.segments)) {
    const realSegments = [];
    for (const entry of stadium.segments) {
      if (isPlainObject(entry) && entry.team != null && entry.p0 != null && entry.p1 != null) {
        stadium.goals.push(entry);
      } else {
        realSegments.push(entry);
      }
    }
    stadium.segments = realSegments;
  }

  return stadium;
}

function parseTemplate(inputPath) {
  const raw = fs.readFileSync(inputPath, 'utf8');
  const prepared = stripLeadingLabel(raw);
  const parsed = unwrapRootObject(yaml.load(prepared));

  if (!isPlainObject(parsed)) {
    throw new Error('Template root must be a YAML object.');
  }

  return applyTopLevelDefaults(normalizeObject(parsed));
}

function discoverTemplates() {
  return fs
    .readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.toLowerCase().endsWith('.yaml'))
    .filter((name) => name.toLowerCase() !== 'stadium_args.yaml')
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }))
    .map((name) => ({
      name,
      label: path.basename(name, path.extname(name)),
      filePath: path.join(TEMPLATES_DIR, name)
    }));
}

function resolveInputPath(inputArg) {
  if (!inputArg) {
    return null;
  }

  const directPath = path.resolve(inputArg);
  if (fs.existsSync(directPath)) {
    return directPath;
  }

  const candidateNames = [inputArg, `${inputArg}.yaml`];
  for (const candidateName of candidateNames) {
    const candidatePath = path.join(TEMPLATES_DIR, candidateName);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return directPath;
}

function renderTemplateMenu(templates) {
  console.log('Available templates:');
  templates.forEach((template, index) => {
    console.log(`${index + 1}. ${template.label}`);
  });
}

async function promptForTemplate() {
  const templates = discoverTemplates();

  if (templates.length === 0) {
    throw new Error(`No YAML templates found in ${TEMPLATES_DIR}`);
  }

  renderTemplateMenu(templates);
  const selection = await askQuestion('Choose template: ');

  if (!selection) {
    throw new Error('No template selected.');
  }

  const numericIndex = Number.parseInt(selection, 10);
  if (Number.isInteger(numericIndex) && numericIndex >= 1 && numericIndex <= templates.length) {
    return templates[numericIndex - 1].filePath;
  }

  const matchedTemplate = templates.find((template) => template.label.toLowerCase() === selection.toLowerCase());
  if (matchedTemplate) {
    return matchedTemplate.filePath;
  }

  throw new Error(`Unknown template selection: ${selection}`);
}

function resolveOutputPath(inputPath, outputArg) {
  if (outputArg) {
    return path.resolve(outputArg);
  }

  const inputBaseName = path.basename(inputPath, path.extname(inputPath));
  return path.join(GENERATED_STADIUMS_DIR, `${inputBaseName}.json`);
}

async function main() {
  const [, , inputArg, outputArg] = process.argv;

  const inputPath = inputArg ? resolveInputPath(inputArg) : await promptForTemplate();
  const outputPath = resolveOutputPath(inputPath, outputArg);

  if (!fs.existsSync(inputPath)) {
    printUsage();
    throw new Error(`Input template not found: ${inputPath}`);
  }

  const stadium = parseTemplate(inputPath);
  const content = `${JSON.stringify(stadium, null, 2)}\n`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content, 'utf8');
  console.log(`Generated ${path.relative(process.cwd(), outputPath)}`);
}

try {
  Promise.resolve(main()).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}