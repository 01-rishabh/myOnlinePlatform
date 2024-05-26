import mongoose, {Schema, Types} from "mongoose";


const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId,
        ref: "User" // the one who is subscribing
    },
    channel: {
        type: Schema.Types.ObjectId,
        ref: "User" // the one to whom subscriber is subscribing
    }
}, {timestamps: true})


export const Subscription = mongoose.model("Subscription", subscriptionSchema)
