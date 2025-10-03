export const config = {
  googleSheets: {
    apiKey: process.env.GOOGLE_SHEETS_API_KEY,
    spreadsheetId: process.env.SPREADSHEET_ID_TEST || process.env.SPREADSHEET_ID,
  },
  alphaPay: {
    publicKey: process.env.NEXT_PUBLIC_ALPHAPAY_PUBLIC_KEY,
    secretKey: process.env.ALPHAPAY_SECRET_KEY,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  email: {
    apiKey: process.env.EMAIL_SERVICE_API_KEY,
    endpoint: process.env.EMAIL_SERVICE_ENDPOINT,
  },
};
