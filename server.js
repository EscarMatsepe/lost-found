require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Simple Multer setup for images
const upload = multer({ dest: 'uploads/' });

// MongoDB Connection (Simple Native Driver)
const client = new MongoClient(process.env.MONGODB_URI);
const dbName = 'campus_lost_found';

app.get('/', (req, res) => {
    res.send('Campus Lost & Found API is running!');
});

// 1. REGISTER (Simple)
app.post('/api/register', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const users = db.collection('users');
        
        // Just save the JSON directly! No complex schemas.
        const newUser = {
            email: req.body.email,
            studentNumber: req.body.studentNumber,
            fullName: req.body.fullName,
            password: req.body.password // Note: In a real app, hash this with bcryptjs
        };
        
        await users.insertOne(newUser);
        res.json({ message: "User registered successfully!", user: newUser });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        await client.close();
    }
});

// 2. POST AN ITEM (Lost or Found)
app.post('/api/items', upload.single('image'), async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const items = db.collection('items');
        
        const newItem = {
            type: req.body.type, // "lost" or "found"
            itemName: req.body.itemName,
            description: req.body.description,
            location: req.body.location,
            imagePath: req.file ? `/uploads/${req.file.filename}` : null,
            datePosted: new Date()
        };
        
        await items.insertOne(newItem);
        res.json({ message: "Item posted!", item: newItem });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        await client.close();
    }
});

// 3. GET ALL ITEMS (For the search bar)
app.get('/api/items', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const items = db.collection('items');
        
        // Get all items, sorted by newest first
        const allItems = await items.find({}).sort({ datePosted: -1 }).toArray();
        res.json(allItems);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        await client.close();
    }
});

// 4. DELETE/RESOLVE ITEM (When found)
app.delete('/api/items/:id', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const items = db.collection('items');
        
        // You will need to convert the string ID to ObjectId for MongoDB
        const { ObjectId } = require('mongodb');
        await items.deleteOne({ _id: new ObjectId(req.params.id) });
        
        res.json({ message: "Item removed from search!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        await client.close();
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});