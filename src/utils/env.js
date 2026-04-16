export const isProduction = window.location.hostname !== "localhost";

export const ENV = isProduction ? "PROD" : "LOCAL";

export const API_BASE = isProduction
  ? "https://your-live-api.com"
  : "http://localhost:5001";

console.log("🌍 ENV:", ENV);