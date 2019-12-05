const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 255
  },
  resetPasswordToken: {
    // 패스워드 재설정을 위한 임시토큰
    type: String
  },
  resetPasswordExpires: {
    // 패스워드 재설정을 위한 임시토큰 접근 가능 시간
    type: Date
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = User = mongoose.model('user', UserSchema);
