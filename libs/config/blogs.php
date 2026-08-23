<?php

    require __DIR__.'/../query.php';
    require_once __DIR__.'/../uploads.php';

    /*
     ========================================================
     -----------------blog DB Table Schemas------------------
     ========================================================

     ========================================================
     ------------Table for blog post categorries-------------
     ========================================================

     CREATE TABLE categories(
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(100) UNIQUE NOT NULL
     )

     ========================================================
     ---------------table for blog authors-------------------
     ========================================================
     CREATE table authors(
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(255) NOT NULL,
          avatar_url VARCHAR(200)
     )

     ========================================================
     --------------------blog post table---------------------
     ========================================================
     CREATE TABLE post(
          id INT PRIMARY KEY AUTO_INCREMENT,
          title VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE NOT NULL,
          excerpt TEXT,
          content TEXT NOT NULL,
          image_url VARCHAR(255) NOT NULL,
          is_featured BOOLEAN DEFAULT FALSE,
          published_at DATE,
          author_id INT,
          category_id INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY(author_id) REFERENCES authors(id) ON DELETE SET NULL,
          FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
    )

    */

    class Blog {
        private $db;

        public function __construct($db) {
            $this->db = $db;
            $this->ensureSchema();
        }

        private function ensureSchema(): void {
            $schemas = [
                "CREATE TABLE IF NOT EXISTS categories (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    name VARCHAR(255) NOT NULL,
                    slug VARCHAR(100) UNIQUE NOT NULL
                )",
                "CREATE TABLE IF NOT EXISTS authors (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    name VARCHAR(100) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    avatar_url VARCHAR(200) NULL
                )",
                "CREATE TABLE IF NOT EXISTS post (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    title VARCHAR(255) NOT NULL,
                    slug VARCHAR(255) UNIQUE NOT NULL,
                    excerpt TEXT NULL,
                    content TEXT NOT NULL,
                    image_url VARCHAR(255) NULL,
                    is_featured BOOLEAN DEFAULT FALSE,
                    published_at DATE NULL,
                    author_id INT NULL,
                    category_id INT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY(author_id) REFERENCES authors(id) ON DELETE SET NULL,
                    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
                )"
            ];

            foreach ($schemas as $sql) {
                $this->db->execute($sql);
            }
        }

        public function getCategory() {
            try {
                $categories = $this->db->query('SELECT * FROM categories ORDER BY id DESC')->bind([])->findAll();
                return ['success' => true, 'data' => $categories];
            } catch (Exception $e) {
                error_log('Error fetching categories: ' . $e->getMessage());
                return ['success' => false, 'message' => 'Failed to fetch categories'];
            }
        }

        public function getAllCategories() {
            return $this->getCategory();
        }

        public function getCategoryById($id) {
            try {
                $category = $this->db->query('SELECT * FROM categories WHERE id = :id')->bind(['id' => $id])->find();
                return ['success' => true, 'data' => $category];
            } catch (Exception $e) {
                error_log('Error fetching category by id: ' . $e->getMessage());
                return ['success' => false, 'message' => 'Failed to fetch category'];
            }
        }

        public function addCategory($data) {
            if (!is_array($data)) {
                throw new InvalidArgumentException('Data must be an array');
            }

            try {
                $payload = $this->sanitizePayload($data, ['name', 'slug']);
                if (empty($payload['name'])) {
                    return ['success' => false, 'message' => 'Category name is required'];
                }

                if (empty($payload['slug'])) {
                    $payload['slug'] = $this->slugify($payload['name']);
                }

                $inserted = $this->db->insert('categories', $payload);
                if ($inserted) {
                    return ['success' => true, 'message' => 'Category added successfully'];
                }

                return ['success' => false, 'message' => 'Failed to add category'];
            } catch (Exception $e) {
                error_log('Error adding category: ' . $e->getMessage());
                return ['success' => false, 'message' => 'Category creation failed'];
            }
        }

        public function editCategory($id, $data) {
            return $this->updateCategory($id, $data);
        }

        public function updateCategory($id, $data) {
            if (!is_array($data)) {
                throw new InvalidArgumentException('Data must be an array');
            }

            try {
                $payload = $this->sanitizePayload($data, ['name', 'slug']);
                if (empty($payload)) {
                    return ['success' => false, 'message' => 'No valid category data provided'];
                }

                if (!empty($payload['slug'])) {
                    $payload['slug'] = $this->slugify($payload['slug']);
                }

                $updated = $this->db->update('categories', $payload, 'id = :id', ['id' => $id]);
                if ($updated) {
                    return ['success' => true, 'message' => 'Category updated successfully'];
                }

                return ['success' => false, 'message' => 'Failed to update category'];
            } catch (Exception $e) {
                error_log('Error updating category: ' . $e->getMessage());
                return ['success' => false, 'message' => 'Category update failed'];
            }
        }

        public function deleteCategory($id) {
            try {
                $deleted = $this->db->query('DELETE FROM categories WHERE id = :id')->bind(['id' => $id])->count();
                return ($deleted > 0)
                    ? ['success' => true, 'message' => 'Category deleted successfully']
                    : ['success' => false, 'message' => 'Category not found'];
            } catch (Exception $e) {
                error_log('Error deleting category: ' . $e->getMessage());
                return ['success' => false, 'message' => 'Category deletion failed'];
            }
        }

        public function get($id = null) {
            try {
                if ($id !== null) {
                    $post = $this->db->query('SELECT p.*, a.name AS author_name, a.email AS author_email, c.name AS category_name FROM post p LEFT JOIN authors a ON p.author_id = a.id LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = :id')->bind(['id' => $id])->find();
                    return ['success' => true, 'data' => $post];
                }

                $posts = $this->db->query('SELECT p.*, a.name AS author_name, a.email AS author_email, c.name AS category_name FROM post p LEFT JOIN authors a ON p.author_id = a.id LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.created_at DESC')->bind([])->findAll();
                return ['success' => true, 'data' => $posts];
            } catch (Exception $e) {
                error_log('Error fetching posts: ' . $e->getMessage());
                return ['success' => false, 'message' => 'Failed to fetch posts'];
            }
        }

        public function getAllPosts() {
            return $this->get();
        }

        public function getPostById($id) {
            return $this->get($id);
        }

        public function create($data = [], ?array $files = null) {
            if (!is_array($data)) {
                throw new InvalidArgumentException('Data must be an array');
            }

            try {
                $authorId = $this->ensureAuthor($data, $files);
                if ($authorId === null) {
                    return ['success' => false, 'message' => 'Author email or author_id is required'];
                }

                $categoryId = $this->resolveCategoryId($data);
                $payload = $this->buildPostPayload($data, $authorId, $categoryId, $files);

                if (empty($payload['title']) || empty($payload['content'])) {
                    return ['success' => false, 'message' => 'Post title and content are required'];
                }

                if (empty($payload['image_url']) && $this->extractUploadedFile('image', $data, $files) === null && empty($data['image_url']) && empty($data['image'])) {
                    return ['success' => false, 'message' => 'Post image is required'];
                }

                $inserted = $this->db->insert('post', $payload);
                if ($inserted) {
                    $postId = $this->db->lastID();
                    return ['success' => true, 'message' => 'Post created successfully', 'data' => ['id' => $postId]];
                }

                return ['success' => false, 'message' => 'Failed to create post'];
            } catch (Exception $e) {
                error_log('Error creating post: ' . $e->getMessage());
                return ['success' => false, 'message' => 'Post creation failed'];
            }
        }

        public function createPost($data = [], ?array $files = null) {
            return $this->create($data, $files);
        }

        public function edit($id, $data = [], ?array $files = null) {
            return $this->update($id, $data, $files);
        }

        public function update($id, $data = [], ?array $files = null) {
            if (!is_array($data)) {
                throw new InvalidArgumentException('Data must be an array');
            }

            try {
                $existingPost = $this->db->query('SELECT image_url FROM post WHERE id = :id')->bind(['id' => $id])->find();
                $authorId = $this->ensureAuthor($data, $files);
                if ($authorId === null) {
                    return ['success' => false, 'message' => 'Author email or author_id is required'];
                }

                $categoryId = $this->resolveCategoryId($data);
                $payload = $this->buildPostPayload($data, $authorId, $categoryId, $files);

                if (empty($payload)) {
                    return ['success' => false, 'message' => 'No valid post data provided'];
                }

                if (empty($payload['image_url']) && !empty($existingPost['image_url'])) {
                    $payload['image_url'] = $existingPost['image_url'];
                }

                $updated = $this->db->update('post', $payload, 'id = :id', ['id' => $id]);
                if ($updated) {
                    return ['success' => true, 'message' => 'Post updated successfully'];
                }

                return ['success' => false, 'message' => 'Failed to update post'];
            } catch (Exception $e) {
                error_log('Error updating post: ' . $e->getMessage());
                return ['success' => false, 'message' => 'Post update failed'];
            }
        }

        public function updatePost($id, $data = [], ?array $files = null) {
            return $this->update($id, $data, $files);
        }

        public function editPost($id, $data = [], ?array $files = null) {
            return $this->edit($id, $data, $files);
        }

        private function sanitizePayload(array $data, array $allowedFields): array {
            $payload = [];
            foreach ($allowedFields as $field) {
                if (array_key_exists($field, $data) && $data[$field] !== null && $data[$field] !== '') {
                    $payload[$field] = $data[$field];
                }
            }
            return $payload;
        }

        private function buildPostPayload(array $data, ?int $authorId = null, ?int $categoryId = null, ?array $files = null): array {
            $payload = [];
            foreach (['title', 'slug', 'excerpt', 'content', 'image_url', 'is_featured', 'published_at'] as $field) {
                if (array_key_exists($field, $data) && $data[$field] !== null && $data[$field] !== '') {
                    $payload[$field] = $data[$field];
                }
            }

            if ($authorId !== null) {
                $payload['author_id'] = $authorId;
            }

            if ($categoryId !== null) {
                $payload['category_id'] = $categoryId;
            }

            if (empty($payload['slug']) && !empty($payload['title'])) {
                $payload['slug'] = $this->slugify($payload['title']);
            }

            if (array_key_exists('is_featured', $payload) && !is_numeric($payload['is_featured'])) {
                $payload['is_featured'] = (int) (bool) $payload['is_featured'];
            }

            if (!empty($payload['image_url']) && is_string($payload['image_url'])) {
                $payload['image_url'] = $payload['image_url'];
            } elseif (empty($payload['image_url'])) {
                $payload['image_url'] = $this->resolvePostImagePath($data, $files);
            }

            return $payload;
        }

        private function ensureAuthor(array $data, ?array $files = null): ?int {
            $authorData = [];

            if (!empty($data['author']) && is_array($data['author'])) {
                $authorData = $data['author'];
            }

            foreach (['name', 'email', 'avatar_url'] as $field) {
                $flatKey = $field;
                if (array_key_exists($flatKey, $data) && $data[$flatKey] !== null && $data[$flatKey] !== '') {
                    $authorData[$field] = $data[$flatKey];
                }

                $prefixedKey = 'author_' . $field;
                if (array_key_exists($prefixedKey, $data) && $data[$prefixedKey] !== null && $data[$prefixedKey] !== '') {
                    $authorData[$field] = $data[$prefixedKey];
                }
            }

            if (!empty($data['author_id']) && is_numeric($data['author_id'])) {
                return (int) $data['author_id'];
            }

            $email = $authorData['email'] ?? null;
            if (empty($email)) {
                return null;
            }

            if (empty($authorData['avatar_url'])) {
                $authorData['avatar_url'] = $this->resolveAuthorAvatarPath($data, $files);
            }

            $existingAuthor = $this->db->query('SELECT id FROM authors WHERE email = :email')->bind(['email' => $email])->find();
            if (!empty($existingAuthor['id'])) {
                $updateData = [];
                if (!empty($authorData['name'])) {
                    $updateData['name'] = $authorData['name'];
                }
                if (!empty($authorData['avatar_url'])) {
                    $updateData['avatar_url'] = $authorData['avatar_url'];
                }

                if (!empty($updateData)) {
                    $this->db->update('authors', $updateData, 'email = :email', ['email' => $email]);
                }

                return (int) $existingAuthor['id'];
            }

            $insertData = ['name' => $authorData['name'] ?? 'Unknown Author', 'email' => $email];
            if (!empty($authorData['avatar_url'])) {
                $insertData['avatar_url'] = $authorData['avatar_url'];
            }

            $inserted = $this->db->insert('authors', $insertData);
            if ($inserted) {
                return (int) $this->db->lastID();
            }

            return null;
        }

        private function resolveAuthorAvatarPath(array $data, ?array $files = null): string {
            $candidates = ['avatar_url', 'avatar', 'author_avatar_url', 'author_avatar'];

            foreach ($candidates as $candidate) {
                $file = $this->extractUploadedFile($candidate, $data, $files);
                if ($file !== null) {
                    $uploaded = uploadMediaFile($file, 'avatars', 'image');
                    if ($uploaded['success'] && !empty($uploaded['path'])) {
                        return $this->toWebPath($uploaded['path']);
                    }
                }
            }

            $authorDataFromPayload = $data['author'] ?? [];
            if (is_array($authorDataFromPayload)) {
                if (!empty($authorDataFromPayload['avatar_url']) && is_string($authorDataFromPayload['avatar_url'])) {
                    return $this->normalizeMediaPath($authorDataFromPayload['avatar_url']);
                }

                if (!empty($authorDataFromPayload['avatar']) && is_string($authorDataFromPayload['avatar'])) {
                    return $this->normalizeMediaPath($authorDataFromPayload['avatar']);
                }
            }

            if (!empty($data['avatar_url']) && is_string($data['avatar_url'])) {
                return $this->normalizeMediaPath($data['avatar_url']);
            }

            if (!empty($data['avatar']) && is_string($data['avatar'])) {
                return $this->normalizeMediaPath($data['avatar']);
            }

            if (!empty($data['author_avatar_url']) && is_string($data['author_avatar_url'])) {
                return $this->normalizeMediaPath($data['author_avatar_url']);
            }

            return $this->ensureDefaultImage('avatar.jpg');
        }

        private function resolvePostImagePath(array $data, ?array $files = null): string {
            $candidates = ['image_url', 'image', 'post_image', 'post_image_url'];

            foreach ($candidates as $candidate) {
                $file = $this->extractUploadedFile($candidate, $data, $files);
                if ($file !== null) {
                    $uploaded = uploadMediaFile($file, 'posts', 'image');
                    if ($uploaded['success'] && !empty($uploaded['path'])) {
                        return $this->toWebPath($uploaded['path']);
                    }
                }
            }

            if (!empty($data['image_url']) && is_string($data['image_url'])) {
                return $this->normalizeMediaPath($data['image_url']);
            }

            return $this->ensureDefaultImage('default-post.jpg');
        }

        private function extractUploadedFile(string $fieldName, array $data, ?array $files = null): ?array {
            if (is_array($files) && isset($files[$fieldName]) && is_array($files[$fieldName]) && !empty($files[$fieldName]['tmp_name'])) {
                return $files[$fieldName];
            }

            if (isset($data[$fieldName]) && is_array($data[$fieldName]) && !empty($data[$fieldName]['tmp_name'])) {
                return $data[$fieldName];
            }

            $nestedCandidates = [
                $data['author'][$fieldName] ?? null,
                $data['author']['avatar'] ?? null,
                $data['author']['avatar_url'] ?? null,
            ];

            foreach ($nestedCandidates as $candidate) {
                if (is_array($candidate) && !empty($candidate['tmp_name'])) {
                    return $candidate;
                }
            }

            return null;
        }

        private function ensureDefaultImage(string $fileName): string {
            $uploadDir = dirname(__DIR__) . '/uploads';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            $targetPath = $uploadDir . '/' . $fileName;
            if (!file_exists($targetPath)) {
                $content = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAgADAAQABQABhQ1qAAAAAElFTkSuQmCC');
                file_put_contents($targetPath, $content);
            }

            return '/media/uploads/' . $fileName;
        }

        private function toWebPath(string $absolutePath): string {
            $baseDir = dirname(__DIR__) . '/uploads';
            $relativePath = str_replace($baseDir, '', $absolutePath);
            $relativePath = ltrim($relativePath, '/');
            return $this->normalizeMediaPath('/media/uploads/' . $relativePath);
        }

        private function normalizeMediaPath(?string $value): string {
            if ($value === null || $value === '') {
                return '';
            }

            $value = trim($value);
            $value = preg_replace('#^https?://[^/]+#', '', $value) ?? $value;
            $value = preg_replace('#/+#', '/', $value);
            $value = preg_replace('#(?:/media/uploads/)+#', '/media/uploads/', $value);

            if (strpos($value, '/var/www/html/media/uploads/') === 0) {
                $value = str_replace('/var/www/html/media/uploads/', '/media/uploads/', $value);
            }

            if (strpos($value, '/media/uploads/') !== 0) {
                if (strpos($value, '/uploads/') === 0) {
                    $value = '/media' . $value;
                } elseif (strpos($value, 'uploads/') === 0) {
                    $value = '/media/' . $value;
                }
            }

            return $value;
        }

        private function resolveCategoryId(array $data): ?int {
            if (!empty($data['category_id']) && is_numeric($data['category_id'])) {
                return (int) $data['category_id'];
            }

            $category = $data['category'] ?? null;
            if (is_array($category)) {
                if (!empty($category['id']) && is_numeric($category['id'])) {
                    return (int) $category['id'];
                }

                $categoryName = $category['name'] ?? $category['slug'] ?? null;
                if (!empty($categoryName)) {
                    $result = $this->db->query('SELECT id FROM categories WHERE name = :name OR slug = :slug')->bind(['name' => $categoryName, 'slug' => $categoryName])->find();
                    if (!empty($result['id'])) {
                        return (int) $result['id'];
                    }
                }
            }

            if (!empty($data['category_name'])) {
                $result = $this->db->query('SELECT id FROM categories WHERE name = :name OR slug = :slug')->bind(['name' => $data['category_name'], 'slug' => $data['category_name']])->find();
                if (!empty($result['id'])) {
                    return (int) $result['id'];
                }
            }

            return null;
        }

        private function slugify($text): string {
            $text = preg_replace('/[\s-]+/', '-', trim($text));
            $text = preg_replace('/[^A-Za-z0-9\-]/', '', strtolower($text));
            return trim($text, '-');
        }
    }