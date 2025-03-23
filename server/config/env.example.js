// Environment variables example file
// Create a .env file based on this template

module.exports = {
  // Server configuration
  PORT: 3001,
  NODE_ENV: 'development',
  CLIENT_URL: 'http://localhost:3000',

  // MongoDB configuration
  MONGODB_URI: 'mongodb://localhost:27017/gymbro',

  // JWT and authentication
  JWT_SECRET: 'your_jwt_secret_here',
  REFRESH_TOKEN_SECRET: 'your_refresh_token_secret_here',
  COOKIE_SECRET: 'your_cookie_secret_here',

  // Google OAuth
  GOOGLE_CLIENT_ID: 'your_google_client_id_here',
  GOOGLE_CLIENT_SECRET: 'your_google_client_secret_here',

  // AI API Keys
  GEMINI_API_KEY: 'your_gemini_api_key_here',
  OPENAI_API_KEY: 'your_openai_api_key_here',
};
