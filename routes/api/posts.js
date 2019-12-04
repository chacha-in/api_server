const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');

const Post = require('../../models/Post');
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const Tag = require('../../models/Tag');

// @route    POST api/posts
// @desc     Create a post
// @access   Private

router.post(
  '/',
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

      if (user.role === 'blacklist') {
        return res.json('넌 글 못써');
      }

      var re = new RegExp(/(#[0-9a-zA-Z가-힝]+)/, 'g');

      // 문자열 구하기
      var searchString = req.body.text;

      searchString = searchString.replace(/</g, '&lt;');

      var matchArray;
      var resultString = '<div>';
      var first = 0;
      var last = 0;
      var hashtagArray = [];
      var standByTag = '';

      // 각각의 일치하는 부분 검색
      while ((matchArray = re.exec(searchString)) != null) {
        last = matchArray.index;

        // 일치하는 모든 문자열을 연결
        resultString += searchString.substring(first, last);
        matchArray[0] = matchArray[0].replace(' ', '');
        // "<a href='/api/routes/search/matchArray[0]'>" + matchArray[0] + "</a>"
        // 일치하는 부분에 강조 스타일이 지정된 class 추가
        resultString +=
          `<a href='/t/${matchArray[0].replace('#', '')}'>` +
          matchArray[0] +
          '</a>';

        first = re.lastIndex;
        // RegExp 객체의 lastIndex 속성을 이용해 검색 결과의 마지막 인덱스 접근 가능
        console.log(matchArray[0]);

        standByTag = matchArray[0].replace('#', '');

        hashtagArray.push(standByTag);

        console.log(hashtagArray);
      }

      // 문자열 종료
      resultString += searchString.substring(first, searchString.length);
      resultString += '</div>';

      const newPost = new Post({
        hashtags: hashtagArray,
        text: resultString,
        imageurl: req.body.imageurl,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      });

      const post = await newPost.save();

      res.json(post);

      const post_id = post.id;

      for (let i = 0; i < hashtagArray.length; i++) {
        console.log(hashtagArray[i]);
        console.log(post_id);
        const tag = await Tag.findOne({ tag: hashtagArray[i] });

        console.log(tag);

        if (tag === null) {
          const newTag = new Tag({
            tag: hashtagArray[i],
            postId: post_id
          });

          await newTag.save();
        } else {
          tag.postId.unshift(post_id);
          console.log(tag);
          await tag.save();
        }
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route    GET api/posts
// @desc     Get all post
// @access   Public
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/posts/:id
// @desc     Get post by user ID
// @access   Private
router.get('/:id', auth, async (req, res) => {
  try {
    console.log(req.params.id);
    const user = req.params.id;
    const post = await Post.find({ user }).sort({ date: -1 });
    console.log(post);

    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    res.json(post);
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

// @route    POST api/posts/comment/:id
// @desc     Comment on a post
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
      const post = await Post.findById(req.params.id);

      const newComment = {
        text: req.body.text,
        imageurl: req.body.imageurl,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      };

      post.comments.unshift(newComment);

      await post.save();

      res.json(post.comments);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route    DELETE api/posts/comment/:id/:comment_id
// @desc     Delete comment
// @access   Private
router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    // Pull out comment
    const comment = post.comments.find(
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
    const removeIndex = post.comments
      .map(like => like.user.toString())
      .indexOf(req.user.id);

    post.comments.splice(removeIndex, 1);

    await post.save();

    res.json(post.comments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
