const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');

const Post = require('../../models/Post');
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const Tag = require('../../models/Tag');
const Toilet = require('../../models/Toilet');

// @route    TOILET api/toilets
// @desc     Create a toilet post
// @access   Private

router.post(
  '/',
  [
    auth,
    [
      check('title', 'Text is required')
        .not()
        .isEmpty(),
      check('latlng', 'Coordinate is required').not().isEmpty()
    ]
  ],
  async (req, res) => {

    console.log(req.body)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, latlng, sex, forDisabled, diaperChangingTable } = req.body

    try {
      const user = await User.findById(req.user.id).select('-password');

      const newToilet = new Toilet({
        title: title,
        description: description,
        latlng: latlng,
        username: user.username,
        // avatar: user.avatar,
        user: req.user.id,
        sex: sex, forDisabled: forDisabled, diaperChangingTable: diaperChangingTable
      });

      const toilet = await newToilet.save()

      res.json(toilet);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route    GET api/toilets
// @desc     Get all toilets
// @access   Public
router.get('/', async (req, res) => {
  try {
    const toilets = await Toilet.find().sort({ date: -1 }).select('-bookmark -comments -likes -stars -__v');
    res.json(toilets);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});



// @route    GET api/toilets/:id
// @desc     Get Toilet by ID
// @access   Private
router.get('/:id', auth, async (req, res) => {
  try {
    console.log(req.params.id);
    const _id = req.params.id;
    const toilet = await Toilet.findOne({ _id })
    console.log(toilet);

    if (!toilet) {
      return res.status(404).json({ msg: 'Toilet not found' });
    }

    res.json(toilet);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Post not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route    DELETE api/posts/:id
// @desc     Delete a post
// @access   Private
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log(req.params.id);
    const post = await Post.findById(req.params.id);
    console.log(post);

    const hashtags = post.hashtags;
    const postId = post._id;
    console.log(hashtags);

    for (let i = 0; i < hashtags.length; i++) {
      console.log(hashtags[i]);
      const tag = await Tag.findOne({ postId });
      console.log(tag);

      tag.postId.splice(postId, 1);
      console.log(tag);

      await tag.save();
    }

    // Check user
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await post.remove();

    res.json({ msg: 'Post removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Post not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route    PUT api/posts/like/:id
// @desc     Like a post
// @access   Private
router.put('/like/:id', auth, async (req, res) => {
  try {
    console.log(req.params.id);
    const post = await Post.findById(req.params.id);

    console.log(post);
    // Check if the post has already been liked
    if (
      post.likes.filter(like => like.user.toString() === req.user.id).length > 0
    ) {
      // Get remove index
      const removeIndex = post.likes
        .map(like => like.user.toString())
        .indexOf(req.user.id);

      post.likes.splice(removeIndex, 1);

      console.log(post);

      await post.save();

      return res.json(post.likes);
    }

    post.likes.unshift({ user: req.user.id });

    await post.save();

    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    PUT api/posts/like/:id
// @desc     Like a post
// @access   Private
// router.put("/like/:id", auth, async (req, res) => {
//   try {
//     const post = await Post.findById(req.params.id);

//     // Check if the post has already been liked
//     if (
//       post.likes.filter(like => like.user.toString() === req.user.id).length > 0
//     ) {
//       return res.status(400).json({ msg: "Post already liked" });
//     }

//     post.likes.unshift({ user: req.user.id });

//     await post.save();

//     res.json(post.likes);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send("Server Error");
//   }
// });

// @route    PUT api/posts/unlike/:id
// @desc     Unlike a post
// @access   Private
// router.put("/unlike/:id", auth, async (req, res) => {
//   try {
//     const post = await Post.findById(req.params.id);

//     // Check if the post has already been liked
//     if (
//       post.likes.filter(like => like.user.toString() === req.user.id).length ===
//       0
//     ) {
//       return res.status(400).json({ msg: "Post has not yet been liked" });
//     }

//     // Get remove index
//     const removeIndex = post.likes
//       .map(like => like.user.toString())
//       .indexOf(req.user.id);

//     post.likes.splice(removeIndex, 1);

//     await post.save();

//     res.json(post.likes);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send("Server Error");
//   }
// });

// @route    POST api/toilets/comment/:id
// @desc     Comment on a toilet
// @access   Private
router.post(
  '/comment/:id',
  [
    auth,
    [
      check('text', 'Text is required')
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select('-password');
      const toilet = await Toilet.findById(req.params.id);

      const newComment = {
        text: req.body.text,
        username: user.username,
        avatar: user.avatar,
        user: req.user.id
      };

      toilet.comments.unshift(newComment);

      await toilet.save();

      res.json(toilet.comments);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route    DELETE api/toilets/comment/:id/:comment_id
// @desc     Delete comment
// @access   Private
router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
  try {
    const toilet = await Toilet.findById(req.params.id);
    console.log(toilet)

    // Pull out comment
    const comment = toilet.comments.find(
      comment => comment.id === req.params.comment_id
    );
    // Make sure comment exists
    if (!comment) {
      return res.status(404).json({ msg: 'Comment does not exist' });
    }

    // Check user
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Get remove index
    const removeIndex = toilet.comments
      .map(comment => comment._id.toString())
      .indexOf(req.params.comment_id);

    console.log(removeIndex)
    toilet.comments.splice(removeIndex, 1);

    console.log(toilet)

    await toilet.save();

    res.json(toilet);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
