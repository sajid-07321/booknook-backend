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
const borrowCollection = db.collection('borrows');

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



app.post('/borrow', verifyToken, async (req, res) => {
  const { bookId, borrowerName, borrowerEmail } = req.body;

  const book = await bookCollection.findOne({
    _id: new ObjectId(bookId),
  });

  if (!book || book.totalCopies <= 0) {
    return res.status(400).send({ message: "Book not available" });
  }

  const existingBorrow = await borrowCollection.findOne({
  bookId,
  borrowerEmail,
  status: "borrowed",
});

if (existingBorrow) {
  return res.status(400).send({
    message: "You have already borrowed this book",
  });
}
  const borrowDate = new Date();
  const returnDate = new Date();
  returnDate.setDate(returnDate.getDate() + 7);

  const borrow = {
    bookId,
    bookTitle: book.title,
    image: book.image ?? book.coverImage ?? book.cover ?? null,
    borrowerName,
    borrowerEmail,
    borrowDate,
    returnDate,
    status: "borrowed",
  };

  await bookCollection.updateOne(
    { _id: book._id },
    { $inc: { totalCopies: -1 } }
  );

  await borrowCollection.insertOne(borrow);

  res.send({ message: "Book borrowed successfully" });
});

app.get("/my-borrow/:email", verifyToken, async (req, res) => {
  const { email } = req.params;

  const result = await borrowCollection
    .find({ borrowerEmail: email })
    .toArray();

  res.send(result);
});


// Return book
app.patch("/my-borrow/return/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  const borrow = await borrowCollection.findOne({
    _id: new ObjectId(id),
    status: "borrowed",
  });

  if (!borrow) {
    return res.status(404).send({ message: "Borrow record not found" });
  }

  await bookCollection.updateOne(
    { _id: new ObjectId(borrow.bookId) },
    { $inc: { totalCopies: 1 } }
  );

  await borrowCollection.updateOne(
    { _id: borrow._id },
    { $set: { status: "returned" } }
  );

  res.send({ message: "Book returned successfully" });
});


// Delete borrow record
app.delete("/my-borrow/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  const borrow = await borrowCollection.findOne({
    _id: new ObjectId(id),
  });

  if (!borrow) {
    return res.status(404).send({ message: "Borrow record not found" });
  }

  if (borrow.status === "borrowed") {
    await bookCollection.updateOne(
      { _id: new ObjectId(borrow.bookId) },
      { $inc: { totalCopies: 1 } }
    );
  }

  await borrowCollection.deleteOne({ _id: borrow._id });

  res.send({ message: "Borrow record deleted successfully" });
});
// http://localhost:5000

app.get('/', (req,res) => {
    res.send({message: 'Server is running fine'})
})

app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
})