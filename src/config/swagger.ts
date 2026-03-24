import swaggerJsdoc from "swagger-jsdoc";
import { fileURLToPath } from "url";
import path from "path";

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Commit Backend API",
      version: "1.0.0",
    },
    servers: [{ url: "/api/v1" }],
  },
  apis: [
    path.resolve(__dirname, "../modules/**/*.docs.ts"),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);