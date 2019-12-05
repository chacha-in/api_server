const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator'); // https://express-validator.github.io/docs/ 사용법

const User = require('../../models/User');

router.get('/', async (req, res) => {
  let user = await User.findOne({ email: 'multicampus@mail.com' });
  res.json(user);
});
// @route    POST api/users
// @desc     Register user // 회원가입
// @access   Public  // 접근권한 모두 가능
router.post(
  '/',
  [
    check('email', '이메일 형식이 아닙니다').isEmail(),
    check('password', '비밀번호는 8자리 이상 입력해 주세요').isLength({
      min: 8
    })
    // check("username", "사용자 이름을 입력해주세요").isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, username } = req.body;

    console.log(req.body);

    try {
      let user = await User.findOne({ email });

      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: '이미 가입된 사용자 이메일 입니다' }] });
      }


      user = new User({
        email,
        password,
        username
      });


      // salt를 생성하여 변수 salt에 담는다.
      const salt = await bcrypt.genSalt(10);

      // 요청받은 패스워드값과 salt를 이용하여 해쉬화 하고 user.password에 담는다.
      user.password = await bcrypt.hash(password, salt);

      // 데이터 베이스에 저장한다.
      await user.save();

      // 토큰에 저장할 user.id값을 payload 변수에 담는다.
      const payload = {
        user: {
          id: user.id
        }
      };

      // jwt 토큰을 생성하고 에러가 없으면 클라이언트에게 토큰을 전달한다.
      jwt.sign(
        payload,
        config.get('jwtSecret'),
        { expiresIn: 360000 },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
      console.log('회원가입 완료')
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

router.put(
  '/modify',
  [
    // name값이 없거나 비어있거나, email값이 email형식이 아니거나, password가 6자리 이하면 에러 메시지를 발생시킨다.
    check('name', 'Name is required')
      .not()
      .isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check(
      'password',
      'Please enter a password with 6 or more characters'
    ).isLength({ min: 6 })
    // ,check("username", "안된다 이놈아").isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, username } = req.body;
    console.log('왜?');
    console.log(name, email, password, username);
    try {
      let user = await User.findOne({ email });

      if (!user) {
        return res
          .status(400)
          .json({ errors: [{ msg: '없는 유저인데 어캐했누?' }] });
      }

      const avatar = gravatar.url(email, {
        s: '200',
        r: 'pg',
        d: 'mm'
      });

      user = new User({
        name,
        email,
        avatar,
        password,
        username
      });

      // salt를 생성하여 변수 salt에 담는다.
      const salt = await bcrypt.genSalt(10);

      // 요청받은 패스워드값과 salt를 이용하여 해쉬화 하고 user.password에 담는다.
      password2 = await bcrypt.hash(password, salt);

      // Update
      const result = await User.updateOne(
        { email: email },
        { $set: { name: name, password: password2, username } }
      );
      console.log(result);
      // 토큰에 저장할 user.id값을 payload 변수에 담는다.
      const payload = {
        User: {
          id: User.id
        }
      };

      // jwt 토큰을 생성하고 에러가 없으면 클라이언트에게 토큰을 전달한다.
      jwt.sign(
        payload,
        config.get('jwtSecret'),
        { expiresIn: 360000 },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// 기업회원 등록
router.post(
  '/registercorporation',
  [
    // name값이 없거나 비어있거나, email값이 email형식이 아니거나, password가 6자리 이하면 에러 메시지를 발생시킨다.
    check('corporation', 'corporation name is required').not(),
    check('email', 'Please include a valid email').isEmail(),
    check(
      'password',
      'Please enter a password with 6 or more characters'
    ).isLength({ min: 6 })
  ],
  async (req, res) => {
    console.log(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { corporation, corporationId, email, password } = req.body;
    console.log(corporation, corporationId, email, password);

    const user = await User.findOne({ email });

    try {
      if (!user) {
        return res
          .status(400)
          .json({ errors: [{ msg: '등록되지 않은 사용자입니다' }] });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res
          .status(400)
          .json({ errors: [{ msg: '패스워드가 맞지 않습니다' }] });
      } else {
        user.corporation.name = corporation;
        user.corporation.corpId = corporationId;
        user.corporation.isApproved = false;
        user.role = 'corporation';
        const result = await user.save();
        return res.json(result.corporation.name);
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// 기업발행 토큰 스마트컨트랙트 계약 주소 등록
router.post(
  '/registercontractaddress',
  [
    check('ca', 'ca is required').not(),
    check('email', 'Please include a valid email').isEmail()
  ],
  async (req, res) => {
    console.log(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { ca, email, tokenSymbol } = req.body;
    console.log(ca, email, tokenSymbol);

    const user = await User.findOne({ email });

    try {
      if (!user) {
        return res
          .status(400)
          .json({ msg: '등록되지 않은 사용자입니다', alertType: 'danger' });
      } else {
        user.corporation.tokenCA = ca;
        user.corporation.tokenSymbol = tokenSymbol;
        user.corporation.isPublishedToken = true;

        const result = await user.save();
        return res.json({
          msg: '토큰 발행이 완료되었습니다',
          alertType: 'success'
        });
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// 기업발행 투표 스마트컨트랙트 계약 주소 등록
router.post(
  '/registervotecontractaddress',
  [
    check('voteCA', 'voteCA is required').not(),
    check('email', 'Please include a valid email').isEmail()
  ],
  async (req, res) => {
    console.log(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, voteCA } = req.body;
    console.log(voteCA);

    const user = await User.findOne({ email });

    try {
      if (!user) {
        return res
          .status(400)
          .json({ msg: '등록되지 않은 사용자입니다', alertType: 'danger' });
      } else {
        user.corporation.voteCA = voteCA;

        const result = await user.save();
        return res.json({
          msg: '전자투표가 등록되었습니다',
          alertType: 'success'
        });
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// 기업발행 토큰 스마트컨트랙트 계약 주소 등록
router.post(
  '/searchcorp',
  [check('searchData', 'searchData is required').not()],
  async (req, res) => {
    console.log(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { searchData } = req.body;
    console.log(searchData);

    const user = await User.find({
      $or: [
        { 'corporation.name': searchData },
        { 'corporation.tokenSymbol': searchData }
      ]
    });
    console.log(user);

    try {
      if (user[0] == null) {
        return res.json({ msg: '찾는 데이터가 없습니다', alertType: 'danger' });
      } else {
        return res.json({
          corpList: user,
          msg: '토큰 발행이 완료되었습니다',
          alertType: 'success'
        });
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// 유저 지갑 주소 등록
router.post(
  '/registerwallet',
  [
    // name값이 없거나 비어있거나, email값이 email형식이 아니거나, password가 6자리 이하면 에러 메시지를 발생시킨다.
    check('whitelistWallet', 'web3Account is required').not()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { whitelistWallet, email } = req.body;
    console.log(whitelistWallet, email);

    const user = await User.findOne({ email });

    const isMatchWallet = user.whitelistWallets.find(address => {
      return address === whitelistWallet;
    });

    if (isMatchWallet) {
      console.log('이미 등록된 지갑 주소입니다');
      return res.json({
        msg: '이미 등록된 지갑 주소입니다',
        alertType: 'danger'
      });
    }

    console.log(isMatchWallet);

    try {
      if (!user) {
        return res.status(400).json({
          errors: [{ msg: '등록되지 않은 사용자입니다', alertType: 'danger' }]
        });
      }

      user.whitelistWallets.push(whitelistWallet);
      console.log(user);
      const result = await user.save();
      return res
        .status(201)
        .json({ msg: '지갑이 등록되었습니다', alertType: 'success' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

router.get('/my_page', async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  } else {
    return res.send('test');
  }
});

module.exports = router;
