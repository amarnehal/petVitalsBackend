import mongoose,{Schema} from "mongoose"

const notificationSchema = new Schema({

    
},{timestamps:true})

export const Notification = mongoose.model("Notification",notificationSchema)