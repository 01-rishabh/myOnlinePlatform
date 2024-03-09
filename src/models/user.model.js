import mongoose, {Schema} from "mongoose";

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




export const User = mongoose.model("User", userSchema);