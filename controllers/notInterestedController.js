const notInterested = require("../models/notInterested");
const NotInterested = require("../models/notInterested") 

async function markNotInterested (req, res) {
    try{
        const userId = req.user._id;
        const { postId } = req.params;
        
        await notInterested.findOneAndUpdate(
            {user: userId , post: postId},
            {user: userId , post: postId},
            {upsert : true  }   
        )

        res.json({message: "Post hidden"})
    } catch (err) {
        return res.status(500).json({message: err.message})
    }
}

async function undoNotInterested(req, res) {
    try{
        await notInterested.findByIdAndDelete({
            user: req.user._id,
            posr: req.params.postId,
        })  

        res.json({message: "Post Unmakrked"})
    } catch (err) {
        res.status(500).json({message: err.message})
    }
}

module.exports = {
    markNotInterested,
    undoNotInterested
}