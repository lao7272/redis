import express from "express";
import cors from "cors";
import axios from "axios";
import Redis from "redis";

const redisClient = Redis.createClient();
const app = express();
const PORT = 8080;
const expiration = 3600;
app.use(cors());
app.use(express.urlencoded({extended: true}))

await redisClient.connect();
app.get("/photos", async (req, res) => {
    const albumId = req.query.albumId;
    try {
        const photos = await getOrSetCache(`photos?albumId=${albumId}`, async () => {
            const { data } = await axios.get(
                "https://jsonplaceholder.typicode.com/photos", 
                {params: {albumId}}
            );
            return data;
        });
        return res.json(photos)

    } catch (e) {
        return res.status(500).send(e.toString());
    }
});

app.get("/photos/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const photos = await getOrSetCache(`photos:${id}`, async () => {
            const { data } = await axios.get(
                `https://jsonplaceholder.typicode.com/photos/${id}`
            );
            return data;
        });
        return res.json(photos);
    } catch (e) {
        return res.status(500).send(e.toString());
    }
});
app.listen(PORT, () => console.log(`Running on port ${PORT}`));


const getOrSetCache = (key, cb) => {
    return new Promise(async (resolve, reject) => {
        try {
            const data = await redisClient.get(key);
            if(!data){
                const freshData = await cb();
                redisClient.setEx(key, expiration, JSON.stringify(freshData));
                return resolve(freshData);
            }
            resolve(JSON.parse(data));
        } catch (e) {
            reject(e)
        }
    })
}
