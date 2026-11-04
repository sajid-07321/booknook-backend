import express from 'express'
import { MongoClient,ObjectId } from 'mongodb';
import 'dotenv/config'
import cors from 'cors'
import { createRemoteJWKSet, jwtVerify } from 'jose';


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

const mongoClient = await connectToMongoDB();

const db = mongoClient.db('booknook');
const bookCollection = db.collection('books');

const verifyToken = async (req,res,next) => {
        const authHeader = req.headers.authorization;
    
        if(!authHeader){
            return res.status(401).send({ message: 'Unauthorized access' });
        }
   
        const token = authHeader.split(" ")[1]
        
    if(!token){
        return res.status(401).send({ message: 'Unauthorized access' });
    }

    const JWKS = createRemoteJWKSet(new URL ('http://localhost:3000/api/auth/jwks'))

    try {
        const {payload} = await jwtVerify(token, JWKS)
        next()
    } catch (error) {
        return res.status(401).send({ message: 'Server not response' });
    }
 };

app.post('/add-book', verifyToken, async (req,res) => {
    const data = req.body;
    
    const result = await bookCollection.insertOne(data);
    console.log(result);
    res.send(result)
})

app.get('/all-book', async (req,res) => {
    const result = await bookCollection.find().toArray();
    res.send(result)
})

app.get('/all-book/:id',verifyToken, async (req,res) => {
    const {id} = req.params
    const result = await bookCollection.findOne({_id: new ObjectId(id)});
    res.send(result)
})

app.get('/my-books/:email',verifyToken, async (req,res) => {
    const {email} = req.params
    const result = await bookCollection.find({userEmail: email}).toArray();
    res.send(result)
})

app.delete('/my-books/:id',verifyToken, async (req,res) => {
    const {id} = req.params
    const result = await bookCollection.deleteOne({_id: new ObjectId(id)});
    res.send(result)
})

app.patch('/my-books/:id', verifyToken, async (req,res) => {
    const {id} = req.params
    const data = req.body
    const result = await bookCollection.updateOne({_id: new ObjectId(id)},{$set: data});
    res.send(result)
})

// http://localhost:5000

app.get('/', (req,res) => {
    res.send({message: 'Server is running fine'})
})

app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
})