const express = require("express");
const app = express();
const dotenv = require("dotenv");
// var admin = require("firebase-admin");
const cors = require("cors");
const ObjectID = require("mongodb").ObjectID;
const { MongoClient } = require("mongodb");


const stripe = require("stripe")(
  "sk_test_51K7XyvJKxcqmkg6LlvMHDC3yRwCNyOGW1tihmm5BCMJPWieO3ung0ai0whkjX1thpnkbVn9mDFm5N3GDq45wecda00LX5KYuZJ"
);

app.use(express.json());
app.use(cors());
dotenv.config();
const port = process.env.PORT || 4000;

// jwt
// const serviceAccount = require("./team-commerce-firebase-adminsdk.json");

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// jwt

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.id3ci.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

// jwt

// async function verifyToken(req, res, next) {
//   if (req?.headers?.authorization?.startsWith("Bearer ")) {
//     const token = req.headers?.authorization.split(" ")[1];
//     try {
//       const decodedUser = await admin.auth().verifyIdToken(token);
//       req.decodedEmail = decodedUser.email;
//     } catch {}
//   }
//   next();
// }
// jwt

async function run() {
  try {
    await client.connect();
    const database = client.db("teamCommerce");

    const mainProductsCollection = database.collection("mainProducts");
    const usersCollection = database.collection("users");
    const orderCollection = database.collection("order");
    const reviewsCollection = database.collection("reviews");

  

    app.get("/singleProductDetail/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectID(id) };
      const result = await mainProductsCollection.findOne(query);
      res.json(result);
    });

    // saving - user - to - database

    app.post("/saveUser", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.json(result);
    });


    // updating-user-if-exist

    app.put("/saveUser", async (req, res) => {
            const user = req.body;
            const upsert = { upsert: true };
            const filter = { email: user.email };
            const updateDocs = {
                $set: { email: user.email, displayName: user.displayName },
            };
            const result = await usersCollection.updateOne(filter, updateDocs, upsert);
            res.send(result)
    });





    
  //  users-orders-collection

    app.post("/order", async (req, res) => {
      const result = await orderCollection.insertOne(req.body);
      res.json(result);
    });


    // updating-user-orders

    app.put("/order", async (req, res) => {
      const find = await orderCollection.findOne({
        _id: ObjectID(req?.body?._id),
      });
      const updateDoc = {
        $set: {
          orderName: req.body.orderName,
          orderEmail: req.body.orderEmail,
          orderPhone: req.body.orderPhone,
          orderAddress: req.body.orderAddress,
          orderCity: req.body.orderCity,
          orderPostalCode: req.body.orderPostalCode,
          totalShoppingCost: req.body.totalShoppingCost,
        },
      };
      const result = await orderCollection.updateOne(find, updateDoc);
      res.json(result);
    });


    // getting-single-user-ordered-product

    app.get("/order/:id", async (req, res) => {
      const result = await orderCollection.findOne({
        _id: ObjectID(req.params.id),
      });
      res.json(result);
    });


    // getting-user-order-by-email

    app.get("/orders/:email", async (req, res) => {
      const result = await orderCollection
        .find({ email: req.params.email })
        .toArray();
      res.json(result);
    });


    // deleting-an-ordered-product

    app.delete("/order/:id", async (req, res) => {
      const result = await orderCollection.deleteOne({
        _id: ObjectID(req.params.id),
      });
      res.json(result);
    });


    // getting-all-orders

    app.get("/allOrders", async (req, res) => {
      const result = await orderCollection.find({}).toArray();
      res.json(result);
    });
    


    // payment-method-stripe-manipulation

    app.post("/create-payment-intent", async (req, res) => {
      const paymentInfo = req.body.totalShoppingCost;
      const amount = paymentInfo * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
      });
      res.json({
        clientSecret: paymentIntent.client_secret,
      });
    });



    app.put("/payment/:id", async (req, res) => {
      const find = await orderCollection.findOne({
        _id: ObjectID(req?.params?.id),
      });
      const payment = req.body;
      const updateDoc = {
        $set: { payment: payment },
      };
      const result = await orderCollection.updateOne(find, updateDoc);
      res.json(result);
    });
 
    // stripe


    // all-products-from-database

    app.get('/getAllProducts', async(req, res)=>{
      const query = {};
      const result = await mainProductsCollection.find(query).toArray();
      res.json(result);
    })


    // get-products-by-category
    
    app.get('/getProductByCategory/:category', async (req, res)=>{
      const category = req.params.category;
      const query = { category: category};
      const result = await  mainProductsCollection.find(query).toArray();
      res.json(result)
    })
    
    // getting-all-users

    app.get('/getAllUsers', async (req, res)=>{
      const result = await usersCollection.find({}).toArray();
      res.json(result);
    })


    // making-admin

    app.put('/admin/:email', async (req, res)=>{
      const email = req.params.email;
      const query = {email: email};
      const updateDoc = {
        $set: {
          role: 'admin',
        },
      };
      const result = await usersCollection.updateOne(query,updateDoc);
      if(result?.modifiedCount){
        res.json(true);
      }else{
        res.json(false);
      }
    })


    // checking-is-admin-or-not

    app.get('/checkAdmin/:email',async (req, res)=>{
      const email = req.params.email;
      const query = {email:email};
      const result = await usersCollection.findOne(query);
      if(result?.role== 'admin'){
        res.json(true)
      }else{
        res.json(false)
      }
    })


    // updating-stock

    app.put('/updateStock', async (req, res)=>{
      const product = req.body;
      const query = {_id: ObjectID(product?.id)}
      const updateDoc = {
        $set: {
          stock: product?.stock,
        },
      };
      const result = await mainProductsCollection.updateOne(query, updateDoc);
      res.json(result)
    })
 


    // save-user-review

    app.post('/saveUserReview', async (req, res,)=>{
      const review= req.body;
      const result = await reviewsCollection.insertOne(review);
      res.json(result);
    })


    
    // update-order-status

    app.put('/orderStatusUpdate', async (req, res)=>{
      const id = req.body.id;
      const status = req.body.status;
      const query = {_id: ObjectID(id)}
      const updateDoc = {
        $set: {
          status: status,
        },
      };
      const result = await orderCollection.updateOne(query, updateDoc);
      res.json(result)
    })


    // delete-product

    app.delete('/deleteProduct/:id', async (req, res)=>{
      const id = req.params.id;
      const query = {_id: ObjectID(id)}
      const result = await mainProductsCollection.deleteOne(query);
      res.json(result);
    })

    // get-all-review

    app.get('/getAllReviews', async (req, res)=>{
      const result =await reviewsCollection.find({}).toArray();
      res.json(result);
    })


  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/trail", async (req, res) => {
  res.json("response came here");
});

app.listen(port, () => {
  console.log("server running at port" + port);
});
