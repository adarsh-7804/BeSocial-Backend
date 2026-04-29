const mongoose = require("mongoose");



const replySchema = new mongoose.Schema(
    {
        user:{
            type:mongoose.Schema.Types.ObjectId,
            ref : "User",
            required: true,
        },
        text:String,
        createdAt:{
            type:Date,
            default:Date.now,
        }
})

const commentSchema = new mongoose.Schema(
    {
        user:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required:true,
        },
        text:{
            type:String,
            required: true,
            maxlength: 300,
        },
        post:{
            type: mongoose.Schema.Types.ObjectId,
            ref:"Post",
            required:true,
        },
        createdAt:{
            type:Date,
            default:Date.now,
        },
        replies:[
            replySchema
        ]
    },{
        timestamps:true,
    }
)

const Comment  = mongoose.model('Comment', commentSchema);

module.exports = Comment