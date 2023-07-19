// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto'); // Generate random ID
const axios = require('axios');

// Create express app
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Store comments
const commentsByPostId = {};

// Get comments for a post
app.get('/posts/:id/comments', (req, res) => {
  const postId = req.params.id;
  res.send(commentsByPostId[postId] || []);
});

// Create a comment for a post
app.post('/posts/:id/comments', async (req, res) => {
  const postId = req.params.id;
  const commentId = randomBytes(4).toString('hex'); // Generate random ID
  const { content } = req.body;

  // Get comments for post
  const comments = commentsByPostId[postId] || [];

  // Add new comment to comments
  comments.push({ id: commentId, content, status: 'pending' });

  // Store comments
  commentsByPostId[postId] = comments;

  // Emit event to event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId, status: 'pending' },
  });

  // Send response
  res.status(201).send(comments);
});

// Handle event from event bus
app.post('/events', async (req, res) => {
  console.log('Received event:', req.body.type);

  // Get event type and data
  const { type, data } = req.body;

  // Check event type
  if (type === 'CommentModerated') {
    // Get comment
    const { id, postId, status, content } = data;

    // Get comments for post
    const comments = commentsByPostId[postId];

    // Find comment in comments
    const comment = comments.find((comment) => comment.id === id);

    // Update comment
    comment.status = status;

    // Emit event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: { id, status, postId, content },
    });
  }

  // Send response