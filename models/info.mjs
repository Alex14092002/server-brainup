import mongoose from "mongoose";

const infoSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  ticket: String,
  checked : {
    type : Boolean,
    default : false
  }
},
{ timestamps: true }
);

const Info = mongoose.model("Info", infoSchema);
export default Info;
