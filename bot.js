const { Telegraf, Markup } = require('telegraf');
const XLSX = require('xlsx');
dotenv = require('dotenv');
dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// простий state
const userState = {};
const userTempCode = {};

// читання Excel
function readCodes() {
  const workbook = XLSX.readFile('codes.xlsx');
  const sheet = workbook.Sheets['Codes'];
  return XLSX.utils.sheet_to_json(sheet);
}

// запис Excel
function writeCodes(data) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Codes');
  XLSX.writeFile(workbook, 'codes.xlsx');
}

// START
bot.start((ctx) => {
  userState[ctx.from.id] = 'waiting';
  ctx.reply('Введіть код');
});

// ВВІД КОДУ
bot.on('text', (ctx) => {
  const text = ctx.message.text;

  // кнопка "ввести новий код"
  if (text === 'Ввести новий код') {
    userState[ctx.from.id] = 'waiting';
    return ctx.reply('Введіть код');
  }

  if (userState[ctx.from.id] !== 'waiting') return;

  const code = text.trim();
  const codes = readCodes();

  const found = codes.find(c => c.Code === code);

  if (!found) {
    return ctx.reply('Код не знайдено');
  }

  // ДІЯ 2 — вже використаний
  if (found.Used === 'yes') {
    return ctx.reply(
      `Код раніше був використаний ${found.Used_At || ''}\nБажаєте ввести новий код?`,
      Markup.keyboard([['Ввести новий код']]).resize()
    );
  }

  // ДІЯ 1 — валідний код
  userTempCode[ctx.from.id] = code;
  userState[ctx.from.id] = 'confirm';

  return ctx.reply(
    'Код дійсний, бажаєте його активувати?',
    Markup.inlineKeyboard([
      [Markup.button.callback('Активувати', 'activate')],
      [Markup.button.callback('Скасувати', 'cancel')]
    ])
  );
});

// АКТИВУВАТИ
bot.action('activate', (ctx) => {
  const code = userTempCode[ctx.from.id];
  let codes = readCodes();

  codes = codes.map(c => {
    if (c.Code === code) {
      return {
        ...c,
        Used: 'yes',
        Used_At: new Date().toLocaleString()
      };
    }
    return c;
  });

  writeCodes(codes);

  userState[ctx.from.id] = 'waiting';

  ctx.editMessageText('Код активовано, Бажаєте ввести новий код?');
  ctx.reply(
    'Ввести новий код',
    Markup.keyboard([['Ввести новий код']]).resize()
  );
});

// СКАСУВАТИ
bot.action('cancel', (ctx) => {
  userState[ctx.from.id] = 'waiting';

  ctx.editMessageText('Операцію скасовано, будь ласка, введіть новий код');
  ctx.reply(
    'Ввести новий код',
    Markup.keyboard([['Ввести новий код']]).resize()
  );
});

bot.launch();