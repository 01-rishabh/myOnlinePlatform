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
    if(!this.isModified("password")) return next(); //jab password field bhejenge code me tabhi hume password encrypt krna hai otherwise next() run kro or aage chalo, yahan pe humne modified lgaya hai taaki hume ye pta ho ki agar koi bhi field schema me modify hui hai other than password to password encrypt na ho.
    this.password = await bcrypt.hash(this.password, 10)
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
            expiresIn: '15m'
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
            expiresIn: '10d'
        }
    )
}


export const User = mongoose.model("User", userSchema);