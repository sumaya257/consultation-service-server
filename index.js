const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000

app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())

const verifyToken = (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    //verify token
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded

        next()
    })

}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ju1bs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        // Access the services collection in the database
        const database = client.db("addService");
        const services = database.collection("services"); // 
        const purchasedItems = database.collection('purchasedItems')

        //creation of jwt token
        app.post('/jwt', (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5h' })
            //set token to the cookie of response
            res.cookie('token', token, {
                httpOnly: true,
                secure: false

            })
                .send({ success: true })
        })

        // Logout route to clear the HTTP-only cookie
        app.post('/logout', (req, res) => {
            res.clearCookie('token', {
                httpOnly: true, // Ensures cookie is HTTP-only
                secure: false  // Use 'true' in production if using HTTPS
            })
                .send({ success: true })
        });




        //add-service data post from client side
        app.post('/services', async (req, res) => {
            const addService = req.body
            const result = await services.insertOne(addService)
            res.send(result)
        })

        //get the services
        app.get('/services', async (req, res) => {
            const cursor = services.find();
            const result = await cursor.toArray();
            res.send(result);
        });

        //add-service data post from client side
        app.post('/add-services',verifyToken, async (req, res) => {
            const addService = req.body
            const result = await services.insertOne(addService)
            res.send(result)
        })



        //manage the services
        app.get('/manage-services', verifyToken, async (req, res) => {
            const email = req.query.email
            if (req.user.email !== req.query.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            query = { serviceProviderEmail: email }

            const cursor = services.find(query)
            const result = await cursor.toArray()
            res.send(result)
        })


        //add-purchasedItems data post from client side
        app.post('/purchased-items', async (req, res) => {
            const addPurchasedItems = req.body
            const result = await purchasedItems.insertOne(addPurchasedItems)
            res.send(result)
        })

        //get the purchased-items
        app.get('/purchased-items',verifyToken, async (req, res) => {
            const email = req.query.email
            let query = {}
            if (email) {
                query = { currentUserEmail: email }
            }
            const cursor = purchasedItems.find(query)
            const result = await cursor.toArray()
            res.send(result)

        })

        //get the services-to-do-items
        app.get('/servicestodo-items',verifyToken, async (req, res) => {
            const email = req.query.email
            let query = {}
            if (email) {
                query = {
                    serviceProviderEmail: email
                }
            }
            const cursor = purchasedItems.find(query)
            const result = await cursor.toArray()
            res.send(result)

        })

        // Update a service
        app.put('/services/:id', async (req, res) => {
            try {
                const id = req.params.id;
                // 1. Extract the ID from the route parameter
                const updatedService = req.body;
                // 2. Extract the updated data from the request body

                delete updatedService._id;
                // 3. Remove the `_id` field from the update object (MongoDB doesn't allow updating the `_id` field)

                const filter = { _id: new ObjectId(id) };
                // 4. Create a filter to locate the service using its `_id`
                const updateDoc = {
                    $set: updatedService,
                    // 5. Use the `$set` operator to specify the fields to be updated
                };

                const result = await services.updateOne(filter, updateDoc);
                // 6. Perform the update operation in the MongoDB collection
                res.send(result);
                // 7. Send the update result back to the client
            } catch (error) {
                console.error('Error updating service:', error);
                // 8. Log any errors for debugging
                res.status(500).send('Internal Server Error');
                // 9. Send an error response in case of failure
            }
        });

        // Update  status endpoint
        app.patch('/servicestodo-items/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const filter = { _id: new ObjectId(id) };
            //Create a filter to locate the service using its `_id`

            const updateDoc = {
                $set: {
                    status: data.serviceStatus,
                }
                //Use the `$set` operator to specify the fields to be updated
            };
            const result = await purchasedItems.updateOne(filter, updateDoc);
            res.send(result);
        });



        // Delete a service
        app.delete('/services/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const result = await services.deleteOne({ _id: new ObjectId(id) });
                res.send(result);
            } catch (error) {
                console.error('Error deleting service:', error);
                res.status(500).send('Internal Server Error');
            }
        });






        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('app is running')
})

app.listen(port, () => {
    console.log('app is running on 5000')
})