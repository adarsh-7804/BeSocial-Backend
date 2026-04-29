const Conversation = require("../../models/Conversation");

// roomHandler.js
module.exports = (io, socket) => {
  socket.on("join_room", (conversationId) => {
    console.log("Backend joined room:", conversationId);
    socket.join(conversationId);
  });

  socket.on("leave_room", (conversationId) => {
    socket.leave(conversationId);
  });

  socket.on("update_group_name", async(data) => {
    const { conversationId, newGroupName } = data;

    try{
      const conversation = await Conversation.findByIdAndUpdate(
        conversationId,
        { groupName: newGroupName },
        { new : true }
      ).populate("participants", "firstName lastName");

      io.to(conversationId).emit("group_name_updated", {
        conversationId,
        newGroupname: conversation.groupName
      })
    } catch (err) {
      socket.emit("error", err.message);
    }
  })

  socket.on("remove_member", async(data) => {
    const {conversationId, memberIdToRemove, userId} = data;

    try {
      const conversation = await Conversation.findById(conversationId);

      if(conversation.groupAdmin.toString() !== userId) {
        socket.emit("error", "ONly admin can remove member");
        return;
      }

      conversation.participants = conversation.participants.filter(
        p => p.toString() !== memberIdToRemove
      );
      await conversation.save();

      io.to(conversationId).emit("member_removed", {
        conversationId,
        removedMemberId: memberIdToRemove
      })

      io.to(memberIdToRemove).emit("removed_from_group", {
        conversationId,
        groupname: conversation.groupName
      });

    } catch(err){
      socket.emit("error", err.message)
    }
  })
};