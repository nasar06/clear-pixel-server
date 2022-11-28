const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config();
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000



app.use(cors())
app.use(express.json())


// connect to database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@assignment12.nrcbtlb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJwt(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorize access-->')
    }

    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send('forbidden access-->')
        }
        req.decoded = decoded
        next()
    })
}



function run() {
    try {

        //database collections
        const categoriesCollection = client.db('Clear-Pixel').collection('categories')
        const camerasCollection = client.db('Clear-Pixel').collection('cameras')
        const OrdersCollection = client.db('Clear-Pixel').collection('Orders')
        const usersCollection = client.db('Clear-Pixel').collection('users')


        // Verify Admin
        const verifyAdmin = async(req, res, next)=>{
            const decodedEmail = req.decoded.email
            const query = {email: decodedEmail}
            const user = await usersCollection.findOne(query)
            
            if(user?.role !== 'admin'){
                return res.status(403).send({message: 'forbidden access'})
            }

            next()
        }

        //get all categories [home page]
        app.get('/categories', async (req, res) => {
            const query = {}
            const result = await categoriesCollection.find(query).toArray()
            res.send(result)
        })

        // get category to cameras [category page]
        app.get('/category/:id', async (req, res) => {
            const id = req.params.id
            const query = { categoryId: id }
            const result = await camerasCollection.find(query).toArray();
            res.send(result)
        })

        //post Order [Order modal page]
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await OrdersCollection.insertOne(order)
            res.send(result)
        })

        //post users [signUp]
        app.post('/users', async (req, res) => {
            const email = req.query.email;
            const query = {email}
            const existingUser = await usersCollection.findOne(query)
            if(existingUser?.email === email){
                return res.status(401).send({massage: 'Already exist This user'})
            }
            const user = req.body;
            const result = await usersCollection.insertOne(user)
            res.send(result)
        })

        //get Orders (bayer) [my orders page]
        app.get('/myOrders', verifyJwt, async (req, res) => {
            const email = req.query.email
            const query = { userEmail: email }
            const options = {
                sort: { "time": -1 }
            }
            const result = await OrdersCollection.find(query, options).toArray()
            res.send(result)
        })

        //delete order
        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const result = await OrdersCollection.deleteOne(filter)
            res.send(result)
        })

        //post product [add product page]
        app.post('/addProduct', async (req, res) => {
            const sellerEmail = req.body.sellerEmail;
            const filter = {email: sellerEmail}
            const seller = await usersCollection.findOne(filter)

            if(seller?.status === 'verified'){
                const product = {...req.body, status: 'verified'};
                
                const result = await camerasCollection.insertOne(product)
                res.send(result)
            }
            else{
                const product = req.body
                const result = await camerasCollection.insertOne(product)
                res.send(result)
            }
        })

        //get products by email [my products page]
        app.get('/myProducts', async (req, res) => {
            const email = req.query.email
            const query = { sellerEmail: email }
            const options = {
                sort: { "time": -1 }
            }
            const result = await camerasCollection.find(query, options).toArray()
            res.send(result)
        })

        //delete my product [myProduct page]
        app.delete('/myProducts/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await camerasCollection.deleteOne(filter)
            res.send(result)
        })

        //update one property [myProducts page]
        app.put('/advertise/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    advertise: 'add'
                }
            }
            const result = await camerasCollection.updateOne(filter, updatedDoc, options)
            
            res.send(result)
        })

        //get advertise product [myProduct page]
        app.get('/advertise/:av', async (req, res) => {
            const av = req.params.av
            const query = { advertise: av }
            const options = {
                sort: { "time": -1 },
              };
            const result = await camerasCollection.find(query, options).limit(3).toArray()
            res.send(result)
        })

        //get allSellers and allBuyer [allSellers page][all buyers page]
        app.get('/usersRole/:role', verifyJwt,verifyAdmin, async (req, res) => {
            const role = req.params.role
            const query = { role: role }
            const options = {
                sort: { 
                    "time": -1 },
              };
            const result = await usersCollection.find(query, options).toArray()
            res.send(result)
        })

        //find adminRoute true or false
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email
            const query = { email }
            const user = await usersCollection.findOne(query)
            res.send({ isAdmin: user?.role === 'admin' })
        })

        //find sellerRoute true or false
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email
            const query = { email }
            const user = await usersCollection.findOne(query)
            res.send({ isSeller: user?.role === 'seller' })
        })

        //delete seller and buyer
        app.delete('/user/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const result = await usersCollection.deleteOne(filter)
            res.send(result)
        })

        //sellerVerify [allSeller page]
        app.put('/user', async (req, res) => {
            const email = req.query.email
            //filter1 userCollection & filter2 camerasCollections
            const filter1 = { email }
            const filter2 = { sellerEmail: email}
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    status: 'verified'
                }
            }
            const result1 = await usersCollection.updateOne(filter1, updatedDoc, options)
            const result2 = await camerasCollection.updateMany(filter2, updatedDoc, options)
            res.send({result1, result2})
        })

        //JWT 
        app.get('/jwt', async (req, res) => {
            const email = req.query.email
            const query = { email }
            const user = await usersCollection.findOne(query)

            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '14d' })
                return res.send({ accessToken: token })
            }
            res.status(403).send({ accessToken: '' })
        })
    }
    finally {

    }
}

run()




app.get('/', (req, res) => {
    res.send('server is on ..........................>>>')
})


app.listen(port)