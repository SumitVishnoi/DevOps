import "dotenv/config"
import express from "express"
import mongoose from "mongoose"
import morgan from "morgan"
import Redis from "ioredis"
import userModel from "./models/user.model.js"

//database setup
const connectDb = async()=> {
    await mongoose.connect(process.env.MONGO_URI)
    console.log("connected to DB")
}

connectDb()

const redis = new Redis(process.env.REDIS_URI);

redis.once("ready", () => {
    console.log("Connected to Redis");
});

redis.on("error", (err) => {
    console.error("Redis connection error:", err);
});

//express setup
const app = express()

app.use(express.json())
app.use(morgan("dev"))

app.post("/user", async (req, res) => {
    try {
        const newUser = new userModel(req.body);
        await newUser.save();
        res.json({
            message: "User created successfully",
            data: newUser
        });
    } catch (error) {
        res.status(500).json({ error: "Error creating user" });
    }
});



app.get("/user/:id", async (req, res)=> {

    const cacheData = await redis.get(`user:${req.params.id}`)
    if(cacheData) {
        return res.status(200).json({
            message:"User fetched successfully from cache",
            user: JSON.parse(cacheData)
        })
    }

    const user = await userModel.findById(req.params.id)

    await redis.set(`user:${req.params.id}`, JSON.stringify(user), "EX", 60 * 60) // cache for 1 hour

    res.status(200).json({
        message: "User fetched successfully",
        user
    })
})


app.listen(3000, ()=> {
    console.log("Server is running on port 3000")
})