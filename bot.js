const dotenv = require('dotenv');
dotenv.config();

const { Telegraf, Markup } = require('telegraf');
const { readCodes, markCodeUsed } = require('./sheets');

const bot = new Telegraf(process.env.BOT_TOKEN);

// простий state
const userState = {};
const userTempCode = {};

// START
bot.start((ctx) => {
  userState[ctx.from.id] = 'waiting';
  ctx.reply('Введіть код');
});

// ВВІД КОДУ
bot.on('text', async (ctx) => {
  const text = ctx.message.text;

  // кнопка "ввести новий код"
  if (text === 'Ввести новий код') {
    userState[ctx.from.id] = 'waiting';
    return ctx.reply('Введіть код');
  }

  if (userState[ctx.from.id] !== 'waiting') return;

  const code = text.trim();

  let codes;
  try {
    codes = await readCodes();
  } catch (e) {
    console.error('Помилка читання Google Sheets:', e.message);
    return ctx.reply('Помилка зʼєднання з базою даних, спробуйте пізніше');
  }

  const found = codes.find((c) => c.Code === code);

  if (!found) {
    return ctx.reply('Код не знайдено');
  }

  // вже використаний
  if (found.Used === 'yes') {
    return ctx.reply(
      `Код раніше був використаний ${found.Used_At || ''}\nБажаєте ввести новий код?`,
      Markup.keyboard([['Ввести новий код']]).resize()
    );
  }

  // валідний код
  userTempCode[ctx.from.id] = code;
  userState[ctx.from.id] = 'confirm';

  return ctx.reply(
    'Код дійсний, бажаєте його активувати?',
    Markup.inlineKeyboard([
      [Markup.button.callback('Активувати', 'activate')],
      [Markup.button.callback('Скасувати', 'cancel')],
    ])
  );
});

// АКТИВУВАТИ
bot.action('activate', async (ctx) => {
  const code = userTempCode[ctx.from.id];

  try {
    await markCodeUsed(code);
  } catch (e) {
    console.error('Помилка запису Google Sheets:', e.message);
    return ctx.reply('Помилка активації, спробуйте пізніше');
  }

  userState[ctx.from.id] = 'waiting';

  await ctx.editMessageText('Код активовано. Бажаєте ввести новий код?');
  ctx.reply(
    'Ввести новий код',
    Markup.keyboard([['Ввести новий код']]).resize()
  );
});

// СКАСУВАТИ
bot.action('cancel', async (ctx) => {
  userState[ctx.from.id] = 'waiting';

  await ctx.editMessageText('Операцію скасовано, будь ласка, введіть новий код');
  ctx.reply(
    'Ввести новий код',
    Markup.keyboard([['Ввести новий код']]).resize()
  );
});

bot.launch();
