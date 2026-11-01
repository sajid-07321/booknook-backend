import express from 'express'
import { MongoClient } from 'mongodb';
import 'dotenv/config'
import cors from 'cors'


const app = express()
const PORT = 5000


app.use(cors())
app.use(express.json())

const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

connectToMongoDB();

app.post('/add-book', (req,res) => {
    const data = req.body;
    console.log(data);
    res.send({massage: 'Book added successfully'})
})

// http://localhost:5000

app.get('/', (req,res) => {
    res.send({massage: 'Server is running fine'})
})

app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
})