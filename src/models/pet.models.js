import mongoose,{Schema} from "mongoose"

const petSchema = new Schema({

    petOwner:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    petType:{
        type:String,
        enum:["Cat","Dog"],
        default:"Dog", 
        required:true,
    },
    name:{
        type:String,
        trim:true,
        required:true,
    },
    age:{
        type:Number,
        required:true,
    },
    gender:{
        type:String,
        enum:["Male","Female"],
        default:"Male",
        required:true,
    }

},{timestamps:true})

petSchema.index({ petOwner: 1, name: 1 }, { unique: true });

export const Pet = mongoose.model("Pet",petSchema)