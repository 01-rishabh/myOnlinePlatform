import dotenv from "dotenv";
import connectDb from "./db/indexDb.js";

dotenv.config({
    path: './env'
});



connectDb()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port: ${process.env.PORT || 8000}`)
    })
    app.on("Error,", (error) => {
        console.error("Err: ", error);
    })
})
.catch((error) => {
    console.log("MongoDb connection failed!!!!", error);
})