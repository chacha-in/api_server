const mongoose = require("mongoose");

const TagSchema = new mongoose.Schema({
  tag: {
    type: String
  },
  postId: [
    {
      type: String
    }
  ]
});

module.exports = Tag = mongoose.model("tag", TagSchema);
