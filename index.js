const express = require("express");
const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

const serviceAccount = require(`./time-travel-watch-zone-firebase-adminsdk-fguos-be61446b83.json`);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2qgnz.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("time-travel");
    const watchesCollection = database.collection("watches");
    const reviewsCollection = database.collection("reviews");
    const usersCollection = database.collection("users");
    const purchaseCollection = database.collection("purchases");

    console.log("db connected successfully");

    // get 6 watches data
    app.get("/limitedWatches", async (req, res) => {
      const cursor = watchesCollection.find({});
      const watches = await cursor.limit(6).toArray();
      res.send(watches);
    });
    // get all watches data
    app.get("/watches", async (req, res) => {
      const cursor = watchesCollection.find({});
      const watches = await cursor.toArray();
      res.send(watches);
    });

       // insert watches
       app.post('/watches',async(req,res)=>{
        const watch = req.body;
        const result = await watchesCollection.insertOne(watch);
        res.json(result);
      })

         // delete watches
    app.delete('/watches/delete/:id',async(req,res)=>{
      const id = req.params.id;
      
      const query = {_id:ObjectId(id)};
      
      const result = await watchesCollection.deleteOne(query);
      res.json(result);

    })

      // get single data from watch collection 
      app.get('/selectedWatch/:id',async(req,res)=>{
        const id = req.params.id;
        const query = {_id:ObjectId(id)};
        const result = await watchesCollection.findOne(query);
        res.send(result);
      })


       // insert purchase 
     app.post('/purchase',async(req,res)=>{
      const purchase = req.body;
      const result = await purchaseCollection.insertOne(purchase);
      res.json(result);
    })

    // get all api data  form reviews collection
    app.get("/reviews", async (req, res) => {
      const cursor = reviewsCollection.find({});
      const reviews = await cursor.toArray();
      res.send(reviews);
    });

    // insert user 
    app.post("/users", async (req, res) => {
      const user = req.body;
      // console.log(user);
      const result = await usersCollection.insertOne(user);
      res.json(result);
    });

    // update user 
    app.put("/users", async (req, res) => {
      const user = req.body;
      // console.log(user);
      const filter = { email: user.email };
      const option = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(filter, updateDoc, option);
      res.json(result);
    });

    // make user admin 
    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      // console.log(user);
      
      const requester = req.decodedEmail;
      // console.log(requester);

      if (requester) {
        const requesterAccount = await usersCollection.findOne({
          email: requester
        });
        if (requesterAccount.role === "admin") {
          const filter = { email: user.email };
          const updateDoc = {
            $set: { role: "admin" }
          };
          const result = await usersCollection.updateOne(filter, updateDoc);
          // console.log(result);
          res.json(result);
        }
      }
      else{
        res.status(403).json({message:'you can not make admin'});
      }
    });

    // check admin 
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;

      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    // get orders by email 
    app.post('/myOrders', async(req,res)=>{
      const email = req.body.email;
      const query = {email:email}
      const orders = await purchaseCollection.find(query).toArray();
      res.json(orders)
    })
    // get all orders data
    app.get("/orders", async (req, res) => {
      const cursor = purchaseCollection.find({});
      const orders = await cursor.toArray();
      res.send(orders);
    });

     // update approved
     app.put('/order/update/:id', async(req,res)=>{
      const status = req.body.status;
      const id = req.params.id;
     
      const filter = {_id:ObjectId(id)};
      const options = { upsert: true };
      
      const updateDoc = {
        $set: {
          
          status:status
        },
      };
      const result = await purchaseCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      // console.log(result);
      res.send(result);
    })


    // delete order//
    app.delete('/order/delete/:id',async(req,res)=>{
      const id = req.params.id;
      
      const query = {_id:ObjectId(id)};
      // console.log(query);
      const result = await purchaseCollection.deleteOne(query);
      res.json(result);

    })

       // insert review 
       app.post('/review',async(req,res)=>{
        const review = req.body;
        const result = await reviewsCollection.insertOne(review);
        res.json(result);
      })
  

  } finally {
    //   await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("time travel is running");
});
app.listen(port, () => {
  console.log("time running on port number:", port);
});
