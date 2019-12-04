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
  corporation: {
    name: {
      // 법인 이름
      type: String
    },
    corpId: {
      // 법인 등록 번호
      type: String
    },
    ci: {
      // 기업 CI image URL
      type: String
    },
    tokenCA: {
      // 발행 토큰 컨트랙트 주소
      type: String
    },
    voteCA: {
      type: String
    },
    tokenSymbol: {
      // 발행 토큰 심볼
      type: String
    },
    isPublishedToken: {
      // 토큰 발행 유무
      type: Boolean
    }
  },
  whitelistWallets: {
    type: [] // 화이트리스트에 등록된 지갑 주소로 접속해야 중요 기능 인가. ex) 토큰 수령 및 투표
  },
  listOfTokens: {
    type: [] // 내가 보유한 법인 토큰 리스트
  },
  resetPasswordToken: {
    // 패스워드 재설정을 위한 임시토큰
    type: String
  },
  resetPasswordExpires: {
    // 패스워드 재설정을 위한 임시토큰 접근 가능 시간
    type: Date
  },
  role: {
    type: String,
    default: 'nomal', // { 일반회원: nomal, 주주: holder, 일반기업: corp, 인증기업: certCorp }
    enum: ['nomal', 'holder', 'corp', 'certCorp']
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = User = mongoose.model('user', UserSchema);
