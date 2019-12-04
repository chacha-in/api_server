const express = require("express");
const request = require("request");
const config = require("config");
const router = express.Router();
const auth = require("../../middleware/auth");
const { check, validationResult } = require("express-validator");

const Profile = require("../../models/Profile");
const User = require("../../models/User");

// @route    GET api/profile/me
// @desc     Get currnt users profile // 현재 사용자 프로파일 가져오기
// @access   Private
router.get("/me", auth, async (req, res) => {
  try {
    // 요청받은 유저 값을 데이터베이스에서 찾고 populate를 실행하여 담는다. 몽구스 메소드 함수인 populate에 대한 이해는 https://www.zerocho.com/category/MongoDB/post/59a66f8372262500184b5363 를 읽어보자.
    const profile = await Profile.findOne({ user: req.user.id }).populate(
      "user",
      [("name", "avatar")]
    );

    // 만약 프로파일이 없으면 상태값 400과 메시지를 클라이언트에게 전달한다
    if (!profile) {
      return res.status(400).json({ msg: "There is no profile for this user" });
    }
    // 존재하면 프로파일 값을 클라이언트에게 전달한다.
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route    Get api/profile/user/:user_id
// @desc     Get profile by user ID  // 시멘틱 url로 전달받은 user_id값으로 프로파일 가져오기
// @access   Public
router.get("/user/:user_id", async (req, res) => {
  try {
    console.log("get user profile by id");
    const profile = await Profile.findOne({
      user: req.params.user_id
    }).populate("user", ["name", "avatar"]);

    if (!profile) return res.status(400).json({ msg: "Profile not found" });

    res.json(profile);
  } catch (err) {
    console.error(err.message);

    if (err.kind === "ObjectId") {
      return res.status(400).json({ msg: "Profile not found" });
    }
    res.status(500).send("Server Error");
  }
});

// @route    POST api/profile
// @desc     Create or update user profile // 유저 프로파일 생성 및 수정
// @access   Private
router.post(
  "/",
  [
    auth,
    [
      // 프로파일 스키마에서 status는 필수 입력 항목으로 지정하였기 때문에 입력값에 status가 없거나 비어있으면 에러 메시지를 전달한다.
      check("status", "Status is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      website,
      location,
      status,
      youtube,
      facebook,
      twitter,
      instagram,
      linkdin
    } = req.body;

    // Build profile object // 프로파일을 객체 형대로 담는다.
    const profileFields = {};

    profileFields.user = req.user.id;

    if (website) profileFields.website = website;
    if (location) profileFields.location = location;
    if (status) profileFields.status = status;

    // Build social object
    profileFields.social = {};
    if (youtube) profileFields.social.youtube = youtube;
    if (twitter) profileFields.social.twitter = twitter;
    if (facebook) profileFields.social.facebook = facebook;
    if (linkdin) profileFields.social.linkdin = linkdin;
    if (instagram) profileFields.social.instagram = instagram;

    console.log(profileFields);

    try {
      // Profile 컬렉션에서 요청된 유저아이디를 찾아 profile변수에 담는다.
      let profile = await Profile.findOne({ user: req.user.id });

      console.log(profile);
      // 만약 프로파일이 존재하면 업데이트한다.
      if (profile) {
        // Update
        profile = await Profile.findOneAndUpdate(
          { user: req.user.id },
          { $set: profileFields },
          { new: true }
        );
        return res.json(profile);
      }

      // 프로파일이 존재하지 않는다면 새로 생성한다.
      // Create
      profile = new Profile(profileFields);

      console.log(profile);
      await profile.save();
      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route    Get api/profile
// @desc     Get all profiles  // 모든 사용자 프로파일 가져오기
// @access   Public
router.get("/", async (req, res) => {
  try {
    const profile = await Profile.find().populate("user", ["name", "avatar"]);
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route    DELETE api/profile
// @desc     Delete profile, user & posts // 사용자 계정 전부 삭제 (프로파일, 포스트 포함)
// @access   Private
router.delete("/", auth, async (req, res) => {
  try {
    // @todo - remove users posts

    // Remove profile
    await Profile.findOneAndRemove({ user: req.user.id });
    // Remove user
    await User.findOneAndRemove({ _id: req.user.id });

    res.json({ msg: "User deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
