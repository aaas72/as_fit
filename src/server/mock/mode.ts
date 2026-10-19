// Mock data mode: USE_MOCK_DATA=true in the environment → every read comes from src/server/mock/mock-data.ts
// and every write is refused. Anything else (unset, false) → the database, as normal.
export const MOCK_MODE = process.env.USE_MOCK_DATA?.trim().toLowerCase() === 'true';

export const MOCK_READ_ONLY_MESSAGE = 'وضع بيانات المحاكاة مفعّل: الحفظ معطّل. أوقف USE_MOCK_DATA للعودة إلى قاعدة البيانات.';
