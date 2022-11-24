// @ts-nocheck
const Products = require('./models/products.mongo')
const Messages = require('./models/messages');
const { formatMessage, formatUser } = require('./utils/utils')
const dbConfig = require('./db/config');
const session = require('express-session');
const express = require('express')
const { Server: HttpServer } = require('http');
const { Server: SocketServer } = require('socket.io')
const PORT = process.env.PORT || 8080
const MongoStore = require('connect-mongo');
const { webAuth } = require('./middlewares/auth');
const errorMiddleware = require('./middlewares/error.middleware');
const path = require('path');

// Instanciamiento 
const app = express();
const httpServer = new HttpServer(app);
const io = new SocketServer(httpServer);

//MiddleWares
app.use(express.static("./public"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }))
app.use(session({
    name: 'my-session',
    secret: 'secretKey-5051',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: 'mongodb+srv://Martin:astor2016@coderhouse.y8qvc3g.mongodb.net/?retryWrites=true&w=majority',
    }),
    rolling: true,
    cookie: {
        maxAge: 60000
    }
}));
// Views

app.set('views', './views/pages');
app.set('view engine', 'ejs');

//
const products = new Products()
let messages = new Messages('messages', dbConfig.sqlite)


const serverConnected = httpServer.listen(PORT, () => {
    products.connect().then(() => {
        console.log('Connected to mongo sucessfully')
    })
    console.log("Server is up and running on Port", PORT)
})

serverConnected.on('error', (error) => {
    console.log(error.message)
})

const users = []

io.on('connection', (socket) => {
    console.log('New client connection')

    products.getAll().then(data => socket.emit('products-history', data));

    socket.on('newProduct', (newProduct) => {

        products.save(newProduct).then(products.getAll().then(data => io.sockets.emit('products-history', data)))


    });

    socket.on('join-chat', (email) => {

        let newUser = {
            id: socket.id,
            email
        }

        users.push(newUser)
    })

    messages.getAll().then(data => socket.emit('messages', data));

    socket.on('new-message', (data) => {

        const author = users.find(user => user.id === socket.id)
        let message = formatMessage(author.email, data)
        messages.newMessage(message)
        messages.getAll()
            .then((data))
            .then((msg) => {
                io.emit('messages', msg)
            })
    })
})

app.get('/', webAuth, async (req, res) => {
    const user = await req.session.user
    res.render(path.join(process.cwd(), 'Public/views/pages/index.ejs'), { user: user })
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html')
});

app.post('/login', (req, res) => {
    const { name, password } = req.body;
    let user = formatUser(name)
    req.session.user = user;
    req.session.save((err) => {
        if (err) {
            console.log("Session error => ", err);
            return res.redirect('/error');
        }
        res.redirect('/');
    })
});

app.post('/logout', async (req, res) => {
    const user = req.session?.user
    console.log('Log de prueba', user)
    if (user.name) {
        req.session.destroy(err => {
            if (!err) {
                res.render(path.join(process.cwd(), 'Public/views/pages/logout.ejs'), { name: user.name })

            } else {
                res.redirect('/')
            }
        })
    } else {
        res.redirect('/')
    }
});

app.get('/logout', async (req, res) => {
    res.redirect('/')
});

/* app.get('/products', (req, res) => {
    res.sendFile(__dirname + '/public/views/layouts/index.hbs')
})
 */
app.post('/products', (req, res) => {
    products.save(req.body)
    res.redirect('/products')
})


app.get('*', (req, res) => {
    res.status(404).send('Página no encontrada')
})

app.use(errorMiddleware)