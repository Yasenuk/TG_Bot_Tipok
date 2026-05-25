const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = 'Codes';

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getSheets() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

// Повертає масив { Code, Used, Used_At }
async function readCodes() {
  const sheets = await getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:C`,
  });

  const rows = response.data.values || [];
  if (rows.length < 2) return [];

  const [, ...data] = rows; // пропускаємо header
  return data.map((row) => ({
    Code: row[0] || '',
    Used: row[1] || '',
    Used_At: row[2] || '',
  }));
}

// Знаходить рядок по коду і оновлює тільки його
async function markCodeUsed(code) {
  const sheets = await getSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:A`,
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((row) => row[0] === code);

  if (rowIndex === -1) return false;

  const rowNumber = rowIndex + 1; // 1-based індекс в Google Sheets

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!B${rowNumber}:C${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [['yes', new Date().toLocaleString('uk-UA')]],
    },
  });

  return true;
}

module.exports = { readCodes, markCodeUsed };
