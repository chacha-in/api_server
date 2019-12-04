const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");
const Tag = require("../../models/Tag");
const Post = require("../../models/Post");

// @route    GET api/tags
// @desc     Get post by tag
// @access   Public
router.get("/:tag", async (req, res) => {
  try {
    const tag = req.params.tag;
    console.log(tag);
    const tagPostList = await Tag.findOne({ tag });
    let posts = [];

    for (let i = 0; i < tagPostList.postId.length; i++) {
      console.log(tagPostList.postId[i]);
      posts.push(await Post.findById(tagPostList.postId[i]));
    }
    console.log(posts);
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
