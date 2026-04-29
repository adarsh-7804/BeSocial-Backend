const User = require("../models/user");
const { createFollowerNotification } = require("./Notificationcontroller");



const freindRequestSent = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetedUserId = req.params.id;

    if (currentUserId === targetedUserId) {
      return res.status(400).json({
        message: "You cannot send request to yourself",
      });
    }

    const targetUser = await User.findById(targetedUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    if (currentUser.friends.includes(targetedUserId)) {
      return res.status(400).json({
        message: "You are already friends with this user",
      });
    }

    if (currentUser.friendRequestsSent.includes(targetedUserId)) {
      return res.status(400).json({
        message: "Request already sent",
      });
    }

    await Promise.all([
      User.findByIdAndUpdate(currentUserId, {
        $addToSet: { friendRequestsSent: targetedUserId },
      }),
      User.findByIdAndUpdate(targetedUserId, {
        $addToSet: { friendRequestsReceived: currentUserId },
      }),
    ]);

    return res.status(201).json({ message: "Friend request sent" });
  } catch (err) {
    console.error("Friend request error:", err);
    return res.status(500).json({ message: err.message });
  }
};

//  ACCEPT FREIND REQUEST

const acceptFriendRequest = async (req, res) => {
  try {
    // const currentUserId = res.user.id;
    const currentUserId = req.user._id.toString();
    const targetedUserId = req.params.id;

    await Promise.all([
      User.findByIdAndUpdate(currentUserId, {
        $pull: { friendRequestsReceived: targetedUserId },
        $addToSet: { friends: targetedUserId },
      }),
      User.findByIdAndUpdate(targetedUserId, {
        $pull: { friendRequestsSent: currentUserId },
        $addToSet: { friends: currentUserId },
      }),
    ]);

    return res.status(200).json({ message: "Friend Request Accepted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


// CANCEL FRIEND REQUEST
const cancelFriendRequest = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetedUserId = req.params.id;

    await Promise.all([
      User.findByIdAndUpdate(currentUserId, {
        $pull: { friendRequestsSent: targetedUserId },
      }),
      User.findByIdAndUpdate(targetedUserId, {
        $pull: { friendRequestsReceived: currentUserId },
      }),
    ]);

    if (req.io) {
      req.io.to(targetedUserId.toString()).emit("friend_request_cancelled", {
        cancelledById: currentUserId.toString(),
        cancelledByName: `${req.user.firstName} ${req.user.lastName}`,
      });
    }

    return res.json({ message: "Friend request cancelled" });
  } catch (err) {
    console.error("Cancel request error:", err);
    return res.status(500).json({ message: err.message });
  }
};


//  REJECT FREIND REQUEST
const rejectFriendRequest = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const senderId = req.params.id;

    await Promise.all([
      // remove from receiver
      User.findByIdAndUpdate(currentUserId, {
        $pull: { friendRequestsReceived: senderId },
      }),

      //  remove from sender's sent list
      User.findByIdAndUpdate(senderId, {
        $pull: { friendRequestsSent: currentUserId },
      }),
    ]);

    return res.json({ message: "Friend request rejected" });
  } catch (err) {
    console.log("Reject error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// UNFREIND USER
const unfriendUser = async (req, res) => {
  //   const currentUserId = req.user.id;
  const currentUserId = req.user._id.toString();
  const targetUserId = req.params.id;

  await Promise.all([
    User.findByIdAndUpdate(currentUserId, {
      $pull: { friends: targetUserId },
    }),
    User.findByIdAndUpdate(targetUserId, {
      $pull: { friends: currentUserId },
    }),
  ]);

  res.json({ message: "Unfriended successfully" });
};

// FOLLOW USER
async function followUser(req, res) {
  try {
    // const currentUserId = req.user.id;
    const currentUserId = req.user._id.toString();
    const targetedUserId = req.params.id;

    if (currentUserId === targetedUserId) {
      return res.status(400).json({
        message: "You cannot follow yourself",
      });
    }

    // const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetedUserId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const followers = targetUser.followers || [];

    if (followers.includes(currentUserId)) {
      return res.status(400).json({
        message: "Already following",
      });
    }

    await Promise.all([
      User.findByIdAndUpdate(targetedUserId, {
        $addToSet: { followers: currentUserId },
      }),
      User.findByIdAndUpdate(currentUserId, {
        $addToSet: { following: targetedUserId },
      }),
    ]);

    await createFollowerNotification(targetedUserId, currentUserId);

    if (req.io) {
      req.io.to(targetedUserId.toString()).emit("follower_notification", {
        recipientId: targetedUserId,
        senderId: currentUserId,
      });
    }

    return res.json({ message: "Followed successfully" });
  } catch (err) {
    console.error("FOLLOW ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
}

// UNFOLLOW USER

async function unfollowUser(req, res) {
  try {
    // const currentUserId = req.user.id;
    const currentUserId = req.user._id.toString();
    const targetedUserId = req.params.id;

    if (currentUserId === targetedUserId) {
      return res.status(400).json({
        message: "You cannot unfollow yourself",
      });
    }

    const currentUser = await User.findById(currentUserId);

    if (!currentUser) {
      return res.json({ message: "User Does not exists" });
    }

    const following = (currentUser.following || []).map((id) => id.toString());

    if (!following.includes(targetedUserId)) {
      return res.status(400).json({
        message: "You are not following this user",
      });
    }

    await Promise.all([
      User.findByIdAndUpdate(targetedUserId, {
        $pull: { followers: currentUserId },
      }),
      User.findByIdAndUpdate(currentUserId, {
        $pull: { following: targetedUserId },
      }),
    ]);

    return res.json({ message: "Unfollowed successfully" });
  } catch (err) {
    console.error("UNFOLLOW ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
}

// GET MUTUAL CONNECTION

async function getMutualConnection(req, res) {
  try {
    const currentUserId = req.user._id.toString();
    const otherUserId = req.params.id;

    const currentUser = await User.findById(currentUserId).select("friends");
    const otherUser = await User.findById(otherUserId).select("friends");

    if (!currentUser || !otherUser) {
      return res.json({ message: "User not found" });
    }

    currentFriend = currentUser.friends.map((id) => id.toString());

    const mutualId = otherUser.friends.filter((id) =>
      currentFriend.includes(id.toString()),
    );

    const mutualUsers = await User.find({
      _id: { $in: mutualId },
    }).select("firstName lastName avatar");

    res.json({
      count: mutualUsers.length,
      mutualConnections: mutualUsers,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

// async function getMutualConnection(req, res) {
//   try {
//     const currentUserId = req.user._id.toString();
//     const otherUserId = req.params.id;

//     const currentUser = await User.findById(currentUserId).select("friends");

//     const otherUser = await User.findById(otherUserId)
//       .populate({
//         path: "friends",
//         select: "firstName lastName avatar friends", //  include friends
//       });

//     if (!currentUser || !otherUser) {
//       return res.json({ message: "User not found" });
//     }

//     const currentFriendIds = currentUser.friends.map((id) =>
//       id.toString(),
//     );

//     const friendsWithMutualCount = otherUser.friends.map((friend) => {
//       const friendIds = friend.friends.map((id) => id.toString());

//       const mutualCount = friendIds.filter((id) =>
//         currentFriendIds.includes(id),
//       ).length;

//       return {
//         _id: friend._id,
//         firstName: friend.firstName,
//         lastName: friend.lastName,
//         avatar: friend.avatar,
//         mutualCount,
//       };
//     });

//     res.json({
//       friends: friendsWithMutualCount,
//     });
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// }

// Suggested User

async function suggestedUser(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const currentUser = await User.findById(req.user.id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const excludeIds = [
      req.user.id,
      ...(currentUser.friends || []).map(u => u._id || u),
      ...(currentUser.friendRequestsSent || []).map(u => u._id || u),
      ...(currentUser.friendRequestsReceived || []).map(u => u._id || u),
    ];

    // console.log("Exclude IDs:", excludeIds.map(id => id.toString()));

    const users = await User.find({
      _id: { $nin: excludeIds },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("firstName lastName avatar bio");

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  freindRequestSent,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  followUser,
  unfollowUser,
  unfriendUser,
  getMutualConnection,
  suggestedUser,
};
