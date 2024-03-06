import dotenv from "dotenv";
import connectDb from "./db/indexDb.js";

dotenv.config({
    path: './env'
});



connectDb();