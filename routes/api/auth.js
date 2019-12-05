const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const config = require('config');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

require('dotenv').config();

const User = require('../../models/User');

router.get('/test', (req, res) => {
  console.log('데이터 잘 받았다');
  return res.json({ data: 'api 잘 작동한다' });
});

// @route    GET api/auth
// @desc
// @access   Public
router.get('/', auth, async (req, res) => {

  try {
    // .select("-password") password는 제외하고 불러온다
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// 개인정보 수정을 위해 값 보내주기
router.get('/update', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('server error');
  }
});

// @route    POST api/auth
// @desc     Authenticate user & get token // 유저 인증 및 토큰 발행
// @access   Public
router.post(
  '/',
  [
    // username must be an email  // 유저네임이 이메일 형식인지 확인한다
    check('email', 'Please include a valid email').isEmail(),
    // password must be at least 6 chars long  // 패스워드가 존재하는지 확인한다
    check('password', 'Password is required').exists()
  ],
  async (req, res) => {
    // check에서 검증했을 때 에러가 발생하면 errors 변수에 담는다. 예를들어 이메일과 패스워드가 형식에 맞게 전달되면 에러는 발생하지 않고, 패스워드가 없이 전달되면 'Password is required'를 errors에 담는다.
    const errors = validationResult(req);
    console.log(errors);
    // Finds the validation errors in this request and wraps them in an object with handy functions
    // 만약 errors변수가 비어있지 않다면, status 400 그리고 에러 메시지를 배열로 담아 클라이언트에게 전달한다
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // 요청받은 email 값을 데이터베이스에서 검증하여 user값에 넣는다
      let user = await User.findOne({ email });


      // 만약 유저가 존재하지 않는다면 status 400 응답과 함께 에러 메시지를 나타낸다.
      if (!user) {
        // res.status(400).json({ errors: [{ msg: "Invalid Credentials" }] });
        res.status(400).json({ errors: [{ msg: 'Invalid Email' }] });
        return;
      }
      // bcrypt의 .compare펑션을 이용하여 전달받은 패스워드와 데이터베이스에 저장된 유저의 패스워드가 일치 하는지 검증하여 isMatch 변수에 담는다.
      const isMatch = await bcrypt.compare(password, user.password);

      // 만약 일치하지 않는다면 status 400과 에러메시지를 클라이언트에게 전달한다. 백엔드에서 나타나는 에러메시지를 json형식의 객체로 전달하면서 키값을 msg로 설정하는 것은 클라이언트에서 받아들일 때 리액트에서 메시지를 처리하는 변수를 지정해 주는 것이다. msg는 리덕스 액션 payload 값에 담게 된다.
      if (!isMatch) {
        // res.status(400).json({ errors: [{ msg: "Invalid Credentials" }] });
        res.status(400).json({ errors: [{ msg: 'Invalid Password' }] });
      }

      const payload = {
        user: {
          id: user.id
        }
      };

      // 유저 아이디값을 payload에 담고 jwt.sign함수를 활용하여 토큰을 생성하고 정상적으로 생성되면 json형식으로 클라이언트에 토큰을 전달한다.
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

// @route    POST api/auth/forgotpassword
// @desc     send email forgotpassword
// @access   Public
router.post(
  '/forgotpassword',
  [
    // username must be an email  // 유저네임이 이메일 형식인지 확인한다
    check('email', 'Please include a valid email').isEmail(),
    check('call_num', 'Please enter your phone number')
      .not()
      .isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);

    console.log(errors);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, call_num } = req.body;

    console.log(email, call_num);

    try {
      let user = await User.findOne({ email });
      if (call_num != user.call_num) {
        res
          .status(400)
          .json({ errors: [{ msg: 'Phone numver is not in database' }] });
        return;
      }

      if (!user) {
        res.status(400).json({ errors: [{ msg: 'email is not in database' }] });
        return;
      } else {
        // STEP 1. Generate a Token
        // 20자까지 해쉬 토큰 생성
        const token = crypto.randomBytes(20).toString('hex');
        console.log(token);
        await user.updateOne({
          resetPasswordToken: token,
          resetPasswordExpires: Date.now() + 3600000
        });

        // Step 2: Create Nodemailer Transport
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: `${process.env.EMAIL_ADDRESS}`,
            pass: `${process.env.EMAIL_PASSWORD}`
          }
        });

        // Step 3: Create Mail Options
        const mailOptions = {
          from: `lets.styel@gmail.com`,
          to: `${user.email}`,
          subject: `Link To Reset Password`,
          text:
            `You ar receiving this because you (or someone else) have requested the reset of the password for your account. \n\n` +
            `Please click on the following link, or paste this into your browser to complete the process within one hour of receiving it: \n\n` +
            `https://styel.io/reset/${token}\n\n` +
            `If you did not request this, please ignore this email and your password will remain unchanged. \n`
        };

        // http://localhost:3000/reset
        // https://styel.io/reset

        console.log('sending email');

        // Step 4: Send Mail
        transporter.sendMail(mailOptions, function (err, response) {
          if (err) {
            console.error('there was an error: ', err);
          } else {
            console.log('here is the res: ', response);
            res.status(200).json('success');
          }
        });
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

router.get('/reset', async (req, res) => {
  try {
    console.log(req.query.resetPasswordToken);

    const user = await User.findOne({
      resetPasswordToken: req.query.resetPasswordToken,
      resetPasswordExpires: {
        $gt: Date.now()
      }
    }).select('-password');

    if (!user) {
      console.log('password reset link is invalid or has expired');
      res.status(400).json({
        errors: [{ msg: 'password reset link is invalid or has expired' }]
      });
      return;
    } else {
      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        config.get('jwtSecret'),
        { expiresIn: 360000 },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.put('/updatePasswordViaEmail', async (req, res) => {
  console.log(req.body.password);
  console.log(req.body.email);
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ errors: [{ msg: 'no user exists in db to update' }] });
    }

    const salt = await bcrypt.genSalt(10);
    // 요청받은 패스워드값과 salt를 이용하여 해쉬화 하고 user.password에 담는다.
    user.password = await bcrypt.hash(password, salt);

    await user.updateOne({
      password: user.password,
      resetPasswordToken: null,
      resetPasswordExpires: null
    });

    console.log('password updated');
    res.status(200).json('password updated');
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;

/*

async function createCourse() {
  const course = new Course({
    name: 'Javascript',
    author: 'Tony',
    tags: ['MERN', 'JS'],
    isPublished: false,
    students: 12
  });
  const result = await course.save();
  console.log(result);
};

// createCourse();


async function getCourse() {
  // 모든 course를 가져오는 동작
  const courses = await Course.find();
  console.log(courses);
  // Basic GET
  // const targetCourse = await Course.find({
  //   name: 'Django',
  //   author: 'Eric'
  // })
  // .limit(10)
  // .sort({ name: 1 })
  // .select({name: 1, tags: 1});
  // console.log(targetCourse);

  // 비교 연산 쿼리

  eq, ne, gt, gte, lt, lte, in, nin
  $gt: 10

  // const targetCourse = await Course.find({
  //     students: { $gte: 12}
  //   }).find({
  //     students: { $in: [100, 200, 300] }
  //   });

  // // 정규 표현식
  // const targetCourse = await Course
  //   // ex1. Er로 시작하는 경우
  //   // .find({ author: /^Er/ })
  //   // ex2. ny로 끝나는 경우
  //   // .find({ author: /ny$/i })
  //   // ex3. on이 들어가는 경우
    // .find({ author: /.*on.i })

  // // count사용
  // const coursesCount = await Course.find().count();
  // console.log(coursesCount);

  // // pagination사용
  // const pageNumber = 2;
  // const pageSize = 10;

  // const targetCourse = await Course.find()
  //   .skip((pageNumber - 1) * pageSize)
  //   .limit(pageSize);

  // console.log(targetCourse);
// };

// getCourse();


async function updateCourse(id) {
  // 1.
  // id값으로 데이터를 확인
  const targetCourse1 = await Course.findById(id);
  if (!targetCourse1) {
    // > 데이터가 없으면, error출력 or 업데이트 중지
    return;
  } else {
    // > 데이터가 있으면, payload로 업데이트
    targetCourse1.name = 'MongoDB';
    targetCourse1.isPublished = true;

    const result = await targetCourse1.save();
    // console.log(result);
  };

  // 2. update()
  const result = await Course.update({ _id: id },{
    $set: {
      name: 'Express.js',
      isPublished: false
    }
  });
  // console.log(result);

  // 3. findByIdAndUpdate
  const result2 = await Course.findByIdAndUpdate({ _id: id}, {
    $set: {
      author: 'Tony',
      name: 'Vue.js',
      isPublished: false
    }
    // { new: true }를 쓰지 않으면, 수정하기 전의 데이터가 반환됨
  }, { new: true });
  console.log(result2);
};

// updateCourse('');




async function deleteCourse(id) {
  // 1. 하나만 지우기
  // const result = await Course.deleteOne({ _id: id });
  // console.log(result);

  // // 2. 여러개 지우기
  // const result2 = await Course.deleteMany({ author: 'Tony' });
  // console.log(result2);

  // 3. 삭제한 document 반환 받기
  const targetCourse = await Course.findByIdAndRemove(id);
  // 삭제되면 document 반환, 삭제할게 없으면 null
  console.log(targetCourse);
};

deleteCourse('5dddc8d6c3ca8204f429a1d8');
*/
