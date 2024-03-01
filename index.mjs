import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import infoRoute from './routes/infoRoute.mjs'

const app = express();
const port = 8000;
dotenv.config();

app.use(cors());
app.use(express.json());

// Kết nối tới MongoDB mà không sử dụng các tùy chọn đã lỗi thời
mongoose.connect(process.env.MONGODB_URL, {
  
  tls: true, // Sử dụng TLS thay vì SSL
  tlsAllowInvalidCertificates: true // Chỉ sử dụng cho môi trường phát triển
});


const db = mongoose.connection;
db.on("error", (error) => {
  console.error("MongoDB connection error:", error);
});

db.once("open", () => {
  console.log("MongoDB connected successfully");
});

app.use('/api/info' , infoRoute)  

app.listen(port , () => console.log(`Example app listening on port ${port}`));
