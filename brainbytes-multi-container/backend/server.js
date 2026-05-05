const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://mongo:27017/brainbytes', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    retryWrites: true
}).then(() => {
    console.log('connected to mongodb');
}).catch(err => {
    console.error('failed to connect to mongodb:', err);
});

const messageSchema = new mongoose.Schema({
    text: String,
    createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

app.get('/', (req, res) => {
    res.json({ message: 'welcome to the brainbytes api' });
});

app.get('/api/messages', async(req, res) => {
    try {
        const messages = await Message.find().sort({ createdAt: -1 });
        res.json(messages);
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/messages', async(req, res) => {
    try {
        const message = new Message({
            text: req.body.text
        });
        const savedMessage = await message.save();
        res.status(201).json(savedMessage);
    } catch(err) {
        res.status(400).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})