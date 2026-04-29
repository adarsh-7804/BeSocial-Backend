const { model } = require("mongoose");
const User = require("../models/user");

const searchUser = async (req, res) => {
    try {

        const { query }  = req.query;

        if(!query) return res.json([])

        const users = await User.find({
            $or: [
                { firstName : { $regex : query , $options : "i" } },
                { lastName : { $regex : query , $options :"i" } },
                // { email : { $regex : query , $options : "i" } }
                { email: { $regex: query, $options: "i" } },
            ],
        }).select("firstName lastName avatar email").limit(6)

        return res.json(users)
        

    } catch (err) {
        console.log("SEARCH ERROR:", err);
        return res.status(500).json({message : err.message})
    }
}

module.exports = {
    searchUser
}