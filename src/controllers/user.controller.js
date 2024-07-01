import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        console.error('Error generating tokens:', error);
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens.");
    }
};

const getUsers = asyncHandler(async(req, res) => {
    const userlist = await User.find()
    if(!userlist){
        res.status(500).json({success: false})
    }

    res.status(200).send(userlist)
})

const registerUser = asyncHandler(async (req, res) => {

   const {userName, fullName, email, password } = req.body;

   if(
    [userName, fullName, email, password].some((field) => 
   field?.trim() === "")
    ){
        throw new Error(400, "All fields are required.");
   }

   const existedUser = await User.findOne({
    $or: [{userName}, {email}]
   })
   
   if(existedUser){
    throw new ApiError(409, "User with this email or userName already exists.");
   }

   const avatarLocalPath = req.files?.avatar[0]?.path;
   //const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
   //const coverImageLocalPath = req.files && req.files.coverImage && req.files.coverImage[0] && req.files.coverImage[0].path;

   let coverImageLocalPath;
   if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
    coverImageLocalPath = req.files.coverImage[0].path
   }


   if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required.");
   }
   

   const avatar = await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)


   if (!avatar) {
    throw new ApiError(400, "Avatar file is required.");
    }

    const lowerCaseuserName = userName ? userName.toLowerCase() : '';

   const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: lowerCaseuserName,
   }) 

   const createdUser = await User.findById(user._id).select("-password -refreshToken")

   if(!createdUser){
    throw new ApiError(500, "Something went wrong while registering the user.");
   }

   return res.status(201).json(
    new ApiResponse(200, createdUser, "The user is created successfully!!!")
   )


})

const loginUser = asyncHandler(async (req, res) => {
    const {email, userName, password} = req.body;


    if(!userName && !email){
        throw new ApiError(400, "userName or email is required.");
    }

    //Here is an alternative of above code based on logic discussed
    //if(!(userName || email)){
    //     throw new ApiError(400, "userName or email is required.")
    //} 

    const user = await User.findOne({
        $or:[{userName}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User does not exist.");
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials.")
    }


    const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: refreshToken, accessToken, loggedInUser
            },
            "User logged In Successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true   
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"))

})

const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token.")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const {accessToken, newRefreshToken} = await generateAccessTokenAndRefreshToken(user._id);
    
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    refreshToken: newRefreshToken, accessToken
                },
                "Access token refreshed."
            )
        )
    
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changePassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(401, "invalid old password");
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "password changed successfully"))

})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(200, req.user, "current user fetched successfully.")
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if(!fullName || !email){
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "User details updated successfully."))
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is not found.")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading the avatar.")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "Updated avatar image"))
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    
    const coverImageLocalPath = req.file?.coverImageLocalPath

    if(!oldCoverImage){
        throw new ApiError(400, "couldn't find the cover image")
    }

    const newCoverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!newCoverImage.url){
        throw new ApiError(400, "Error while uploading the cover image.")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                newCoverImage: newCoverImage.url
            }
        },
        {new: true}
    ).select("-password")

    
    return res.status(200).json(new ApiResponse(200, user, "Updated cover image"))

})

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {userName} = req.params

    if(!username?.trim()){
        throw new ApiError(400, "Username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
        		localField: "_id",
		        foreignField: "channel",
		        as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
        		localField: "_id",
		        foreignField: "subscriber",
		        as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                userName: 1,
                email: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "Channel does not exists")
    }

    console.log(channel);
    
    return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "User channel fetched successfully."))
})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watched history fetched successfully"
        )
    )
})

export{
    registerUser,
    loginUser,
    logoutUser,
    getUsers,
    refreshAccessToken,
    changePassword,
    updateAccountDetails,
    getCurrentUser,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}


