import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {
        userName: {
            type: String,
            require: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,                // used in searching in an optimised way
        },
        email: {
            type: String,
            require: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        fullName: {
            type: String,
            require: true,
            trim: true,
            index: true,    
        },
        avatar: {
            type: String,       //cloudinary url
            require: true,
        },
        coverImage: {
            type: String,       //cloudinary url
        },
        password: {
            type: String,
            require:[ true, "Password is required."]
        },
        refreshToken: {
            type: String,
        },
        watchHistory: [{
            type: Schema.Types.ObjectId,
            ref: "Video"
        }],
    },
    {
        timestamps: true
    }
)


userSchema.pre("save", async function(next) {
    if(!this.isModified("password")) return next();
    this.password = bcrypt.hash(this.password, 10)
    next()
})

//making your own custom methods in mongoose

userSchema.methods.isPasswordCorrect = async function(password){
  return await bcrypt.compare(password, this.password)  //bcrypt library agar line 55 me password hash kr skti hai to yehi library password check bhi kr skti hai.
}


userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            userName: this.userName,
            fullName: this.fullName,

        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: ACCESS_TOKEN_SECRET
        }
    )
}


userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: REFRESH_TOKEN_SECRET
        }
    )
}


export const User = mongoose.model("User", userSchema);