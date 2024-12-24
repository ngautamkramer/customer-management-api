process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const crypto = require('crypto');

const { Server } = require('socket.io');
const http = require('http');

const fs = require('fs');
const multer = require('multer');
const path = require('path');


const app = express();

app.use(express.json());

// Enable CORS for all requests
app.use(cors());

app.use('/uploads', express.static(path.join(__dirname, 'uploads/')));


// Create HTTPS server
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (adjust as needed for production)
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Start the server
server.listen(8080, () => {
  console.log(`Server running at http://localhost:8080/`);
});





// postgres connection
const client = new Client({ user: 'postgres', host: 'localhost', database: 'angular-user-management', password: 'root', port: '5432', });

client.connect().then(() => { 
	console.log('Connected to PostgreSQL database!'); 
}).catch((err) => { 
	console.error('Error connecting to the database:', err);
});


//gen
function generateMD5Hash(data) {
  return crypto.createHash('md5').update(data).digest('hex');
}

app.get("/check", async(req, res, next) => {
	res.status(400).json({ success: false, message: 'working' });
});


//regsiter user api
app.post("/register", async(req, res, next) => {

	const datetime= new Date().toISOString();
 	const requestBody = req.body;
 	
	try{
    	const result = await client.query('SELECT 1 FROM users WHERE email ILIKE $1 LIMIT 1', [requestBody.email]);
    	if(result.rowCount > 0){
    		res.status(200).json({ success: true, data: 'email_exist' });
    	}else{
	    	const response = await client.query('INSERT INTO users (name, email, password, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [requestBody.name, requestBody.email, generateMD5Hash(requestBody.password), 1, datetime, datetime]);
	    	res.status(200).json({ success: true, data: response.rows[0] });
			}
	}catch(err){
	    console.error('Error register user:', err);
	   	res.status(400).json({ success: false, message: err });
	}

});


//regsiter user api
app.post("/login", async(req, res, next) => {

 	const requestBody = req.body;
 	
	try{
    	
    	const result = await client.query('SELECT user_id, email, name FROM users WHERE email = $1 AND password = $2', [requestBody.email, generateMD5Hash(requestBody.password)]);
    	if(result.rowCount > 0){
    		res.status(200).json({ success: true, data: result.rows[0] });
    	}else{
	    	res.status(200).json({ success: false });
			}

	}catch(err){
	    console.error('Error on login user:', err);
	   	res.status(400).json({ success: false, message: err });
	}

});





//regsiter user api
app.post("/addcustomer", async(req, res, next) => {

	const datetime= new Date().toISOString();
 	const requestBody = req.body;
 	
	try{
	    const response = await client.query('INSERT INTO customers (user_id, name, mobile_number, address, visit_date, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [requestBody.user_id, requestBody.name, requestBody.mobile_number, requestBody.address, requestBody.visit_date, datetime, datetime]);
	    res.status(200).json({ success: true, data: response.rows[0] });

	}catch(err){
	    console.error('Error inserting user:', err);
	   	res.status(400).json({ success: false, message: err });
	}

});


//regsiter user api
app.get("/customers/:user_id", async(req, res, next) => {

	try{
	    const response = await client.query('SELECT * FROM customers WHERE user_id=' + req.params.user_id);
	    res.status(200).json({ success: true, data: response.rows });

	}catch(err){
	    console.error('Error getting user:', err);
	   	res.status(400).json({ success: false, message: err });
	}

});



app.delete("/customers/:user_id/:customer_id", async(req, res, next) => {

	try{
			if(req.params.customer_id && req.params.user_id){
	    	const response = await client.query('DELETE FROM customers WHERE user_id=' + req.params.user_id + ' AND c_id='+ req.params.customer_id);
	    	res.status(200).json({ success: true});
	  	}else{
	  		res.status(400).json({ success: false, message: 'Internal server error.' });
	  	}

	}catch(err){
	    console.error('Error getting user:', err);
	   	res.status(400).json({ success: false, message: err });
	}

});




app.get("/customer/:user_id/:customer_id", async(req, res, next) => {

	try{
			if(req.params.customer_id && req.params.user_id){
	    	const response = await client.query('SELECT * FROM customers WHERE user_id=' + req.params.user_id + ' AND c_id='+ req.params.customer_id);
	    	res.status(200).json({ success: true, data: response.rows[0]});
	  	}else{
	  		res.status(400).json({ success: false, message: 'Internal server error.' });
	  	}

	}catch(err){
	    console.error('Error getting user:', err);
	   	res.status(400).json({ success: false, message: err });
	}

});



app.put("/customer", async(req, res, next) => {

	try{
		const requestBody = req.body;

		if(requestBody.customer_id && requestBody.user_id){

    	const query = 'UPDATE customers SET name = $1, mobile_number = $2, address = $3, visit_date = $4 WHERE user_id = $5 AND c_id = $6 RETURNING *';
      const response = await client.query(query, [requestBody.name, requestBody.mobile_number, requestBody.address, requestBody.visit_date, requestBody.user_id, requestBody.customer_id]);

    	res.status(200).json({ success: true, data: response.rows[0]});
  	}else{
  		res.status(400).json({ success: false, message: 'Internal server error.' });
  	}

	}catch(err){
	    console.error('Error getting user:', err);
	   	res.status(400).json({ success: false, message: err });
	}

});


app.put("/customer/change-password", async(req, res, next) => {

	try{

		const requestBody = req.body;
		console.log(requestBody);

		if(requestBody.user_id){

			const result = await client.query('SELECT password FROM users WHERE user_id=$1', [requestBody.user_id]);
    	if(result.rowCount > 0){

    		let old_password = generateMD5Hash(requestBody.old_password);

    		if (result.rows[0].password == old_password) {

    			const query = 'UPDATE users SET password = $1 WHERE user_id = $2';
	      	const response = await client.query(query, [generateMD5Hash(requestBody.new_password), requestBody.user_id]);
	      	res.status(200).json({ success: true});

    		}else{

    			res.status(200).json({ success: false, message: 'Invalid Old password'});
    		}

    	}
    	
  	}else{
  		res.status(400).json({ success: false, message: 'Internal server error.' });
  	}

	}catch(err){
	    console.error('Error getting user:', err);
	   	res.status(400).json({ success: false, message: err });
	}

});


// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Directory to save uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  }
});

const upload = multer({ storage: storage });

// POST route to upload the file
app.post('/upload_files', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded' });
  }
  
  res.status(200).send({file: req.file});
});



//WebSocket connection
io.on('connection', (socket) => {
    
    console.log('A user connected:', socket.id);

    //Listen for client messages
    socket.on('clientMessage', (clientObject) => {
      var messageJosn = {client_id: clientObject.client_id, name: clientObject.name, message: clientObject.message, datetime: Date.now(), files: clientObject.files};
      console.log('Message sent to the client:', messageJosn);
      io.emit('serverMessage', messageJosn);
    });

    // Listen for typing event
	  socket.on('startTyping', (name) => {
	    socket.broadcast.emit('startTyping', name); // Broadcast to all except sender
	  });

	  // Listen for stop typing event
	  socket.on('stopTyping', (name) => {
	    socket.broadcast.emit('stopTyping', name); // Notify others typing stopped
	  });

    //Handle disconnection
    socket.on('disconnect', () => {
      console.log('A user disconnected:', socket.id);
    });

    // Handle errors
	  socket.on('error', (err) => {
	    console.error(`Socket error: ${err}`);
	  });

});
