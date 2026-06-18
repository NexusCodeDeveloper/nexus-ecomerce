import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import cookieParser from "cookie-parser";

dotenv.config();
connectDB();
const app = express();
const port = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true, // Habilitamos el uso de cookies para el login
  }),
);
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.listen(port, () => {
  console.log(`Servidor backend corriendo en http://localhost:${port}`);
});
