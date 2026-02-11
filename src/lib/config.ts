// src/lib/config.ts
interface Config {
  googleSheets: {
    apiKey?: string;
    spreadsheetId?: string;
  };
  alphaPay: {
    publicKey?: string;
    secretKey?: string;
  };
  api: {
    masterKey?: string;
  };
  jwt: {
    secret: string;
  };
  email: {
    apiKey?: string;
    endpoint?: string;
  };
}

export const config: Config = {
  googleSheets: {
    apiKey: process.env.GOOGLE_SHEETS_API_KEY,
    spreadsheetId: process.env.SPREADSHEET_ID,
  },
  alphaPay: {
    publicKey: process.env.NEXT_PUBLIC_ALPHAPAY_PUBLIC_KEY,
    secretKey: process.env.ALPHAPAY_SECRET_KEY,
  },
  api: {
    masterKey: process.env.API_MASTER_KEY,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
  },
  email: {
    apiKey: process.env.EMAIL_SERVICE_API_KEY,
    endpoint: process.env.EMAIL_SERVICE_ENDPOINT,
  },
};
