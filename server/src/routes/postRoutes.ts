import express from 'express';
import { body } from 'express-validator';
import * as postController from '../controllers/postController';
import { authenticateToken } from '../middleware/auth';
import { uploadPostImage, verifyUploadedFile, checkFormDataContent, debugSavedFile } from '../middleware/upload';
import { validate } from '../middleware/validation';
import { Request, Response, NextFunction } from 'express';

const router = express.Router();

// Post validation
const postValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Post content must be between 1 and 1000 characters')
];

// Wrapper for controller functions to return void
const asyncWrapper = (fn: (req: Request, res: Response) => Promise<any>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Get all posts with pagination
 *     description: Retrieve a list of posts with pagination options for the feed.
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of posts per page
 *     responses:
 *       200:
 *         description: A list of posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 60a12e5b8f46a13d48b5d6c2
 *                       content:
 *                         type: string
 *                         example: Just completed my workout!
 *                       imageUrl:
 *                         type: string
 *                         example: /uploads/posts/image-1621234252525.jpg
 *                       user:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: 6082fd3d12e87a001cb57f32
 *                           username:
 *                             type: string
 *                             example: johndoe
 *                           profilePicture:
 *                             type: string
 *                             example: /uploads/profiles/default.png
 *                       commentsCount:
 *                         type: integer
 *                         example: 5
 *                       likesCount:
 *                         type: integer
 *                         example: 12
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2023-03-17T08:30:00Z
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2023-03-17T08:30:00Z
 *                 totalPosts:
 *                   type: integer
 *                   example: 50
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *                 totalPages:
 *                   type: integer
 *                   example: 5
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', postController.getAllPosts);

/**
 * @swagger
 * /api/posts/user/{userId}:
 *   get:
 *     summary: Get posts by user ID
 *     description: Retrieve all posts created by a specific user.
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of posts per page
 *     responses:
 *       200:
 *         description: List of posts by the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *                 totalPosts:
 *                   type: integer
 *                   example: 15
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *                 totalPages:
 *                   type: integer
 *                   example: 2
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/user/:userId', postController.getPostsByUser);

/**
 * @swagger
 * /api/posts/trending:
 *   get:
 *     summary: Get trending posts
 *     description: Retrieve posts sorted by popularity (most likes and comments).
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of trending posts to retrieve
 *     responses:
 *       200:
 *         description: List of trending posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/trending', postController.getTrendingPosts);

/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Create a new post
 *     description: Create a new post with optional image upload.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Post content text
 *                 example: Just finished my workout! Feeling great! 💪
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Optional image file to upload
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 post:
 *                   $ref: '#/components/schemas/Post'
 *       400:
 *         description: Validation error in request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized, authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/',
  authenticateToken,
  checkFormDataContent,
  uploadPostImage,
  debugSavedFile,
  verifyUploadedFile,
  validate(postValidation),
  asyncWrapper(postController.createPost)
);

/**
 * @swagger
 * /api/posts/{postId}:
 *   get:
 *     summary: Get a specific post
 *     description: Retrieve details of a specific post by its ID.
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the post to retrieve
 *     responses:
 *       200:
 *         description: Post details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 post:
 *                   $ref: '#/components/schemas/Post'
 *       404:
 *         description: Post not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:postId', asyncWrapper(postController.getPostById));

/**
 * @swagger
 * /api/posts/{id}:
 *   put:
 *     summary: Update a post
 *     description: Update an existing post's content and/or image.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the post to update
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Updated post content
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: New image (optional)
 *               removeImage:
 *                 type: string
 *                 enum: ["true", "false"]
 *                 description: Set to "true" to remove the existing image without adding a new one
 *     responses:
 *       200:
 *         description: Post updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 post:
 *                   $ref: '#/components/schemas/Post'
 *                 message:
 *                   type: string
 *                   example: Post updated successfully
 *       400:
 *         description: Validation error in request data
 *       401:
 *         description: Unauthorized, authentication required
 *       403:
 *         description: Forbidden, user not authorized to update this post
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */
router.put(
  '/:id',
  authenticateToken,
  uploadPostImage,
  validate(postValidation),
  asyncWrapper(postController.updatePost)
);

/**
 * @swagger
 * /api/posts/{postId}:
 *   delete:
 *     summary: Delete a post
 *     description: Delete an existing post and its associated image (if any).
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the post to delete
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Post deleted successfully
 *       401:
 *         description: Unauthorized, authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden, user is not the post owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Post not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:postId', authenticateToken, asyncWrapper(postController.deletePost));

export default router; 