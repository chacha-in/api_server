const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ToiletSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "users"
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  latlng: {
    type: Object
  },
  avatar: {
    type: String
  },
  username: {
    type: String
  },
  sex: {
    type: String,
    enum: ['maleOnly', 'femaleOnly', 'both']
  },
  forDisabled: {
    type: Boolean,
    default: false
  },
  diaperChangingTable: {
    type: Boolean,
    default: false
  },
  stars: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "users"
      },
      star: Number
    }
  ],
  likes: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "users"
      }
    }
  ],
  bookmark: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "users"
      }
    }
  ],
  comments: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "users"
      },
      text: {
        type: String,
        required: true
      },
      username: {
        type: String
      },
      avatar: {
        type: String
      },
      date: {
        type: Date,
        default: Date.now
      }
    }
  ],
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = Toilet = mongoose.model("toilet", ToiletSchema);
