<?php
   require_once __DIR__.'/../query.php';
   require_once __DIR__.'/../Mailer.php';
   require_once __DIR__.'/./PasswordResetToken.php';

   /*
     CREATE TABLE users (
       id INT AUTO_INCREMENT PRIMARY KEY,
       firebase_uid VARCHAR(128) NOT NULL UNIQUE,
       email VARCHAR(255) NULL,
       name VARCHAR(255) NULL,
       role VARCHAR(50) NOT NULL DEFAULT 'user',
       status VARCHAR(50) NOT NULL DEFAULT 'active',
       password VARCHAR(255) NULL DEFAULT NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
     );
     
      
     ALTER TABLE users ADD COLUMN password VARCHAR(255) NULL DEFAULT NULL AFTER status;

     CREATE TABLE password_reset_tokens (
       id INT AUTO_INCREMENT PRIMARY KEY,
       user_id INT NOT NULL,
       token VARCHAR(255) NOT NULL UNIQUE,
       expires_at TIMESTAMP NOT NULL,
       used TINYINT DEFAULT 0,
       used_at TIMESTAMP NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
       INDEX idx_token (token),
       INDEX idx_expires (expires_at)
     );
   */

   class Users {
        private $db;

        function __construct() {
            $this->db = new Queries();
        }

        function viewUsers($auth = null) {
            $fetch_all = $this->db->execute('SELECT * FROM users ORDER BY created_at DESC');
            $response = ['status' => true, 'data' => $fetch_all->fetchAll()];

            if (!empty($auth)) {
                $response['auth'] = $auth;
            }

            echo json_encode($response);
        }

        function addUsers(array $data, $auth = null) {
            if (!is_array($data)) {
                throw new InvalidArgumentException('Data must be an array');
            }

            if (!empty($auth['authenticated']) && !empty($auth['uid'])) {
                $data['firebase_uid'] = $data['firebase_uid'] ?? $auth['uid'];
                $data['email'] = $data['email'] ?? $auth['email'];
                $data['name'] = $data['name'] ?? $auth['name'];
            }

            $data = array_merge(['role' => 'user', 'status' => 'active'], $data);

            try {
                $inserted = $this->db->insert('users', $data);
                
                if ($inserted) {
                    // Get the last inserted user ID
                    $lastId = $this->db->query('SELECT LAST_INSERT_ID() as id')->find();
                    $userId = $lastId['id'] ?? null;
                    
                    // Send welcome email with password reset link
                    if (!empty($data['email']) && !empty($data['name']) && $userId) {
                        $this->sendWelcomeEmail($userId, $data['email'], $data['name']);
                    }
                    
                    $results = ['status' => true, 'message' => 'user added successfully and welcome email sent'];
                } else {
                    $results = ['status' => false, 'message' => 'Failed to add user'];
                }
                echo json_encode($results);
            } catch (Exception $e) {
                echo json_encode(['status' => false, 'message' => 'invalid data']);
                error_log(json_encode(['status' => false, 'message' => $e->getMessage()]));
            }
        }

        /**
         * Send welcome email with password reset link
         */
        private function sendWelcomeEmail($userId, $email, $name) {
            try {
                $tokenManager = new PasswordResetToken();
                $tokenResult = $tokenManager->generateToken($userId);
                
                if (!$tokenResult['success']) {
                    error_log('Failed to generate password reset token for user ' . $userId);
                    return false;
                }
                
                $resetLink = $_ENV['APP_URL'] . '/reset-password?token=' . $tokenResult['token'];
                
                $mailer = new Mailer();
                $mailResult = $mailer->sendWelcomeEmail($email, $name, $resetLink);
                
                if (!$mailResult) {
                    error_log('Failed to send welcome email to ' . $email);
                    return false;
                }
                
                return true;
            } catch (Exception $e) {
                error_log('Error sending welcome email: ' . $e->getMessage());
                return false;
            }
        }

        function editUsers(array $data, string $id, $auth = null) {
            if (!is_array($data)) {
                throw new InvalidArgumentException('invalid data');
            }

            if (!empty($auth['authenticated']) && !empty($auth['uid'])) {
                $data['firebase_uid'] = $data['firebase_uid'] ?? $auth['uid'];
                $data['email'] = $data['email'] ?? $auth['email'];
                $data['name'] = $data['name'] ?? $auth['name'];
            }

            try {
                $update = $this->db->update('users', $data, 'id = :id', ['id' => $id]);
                $results = ($update)
                    ? ['status' => true, 'message' => 'user details edited successfully']
                    : ['status' => false, 'message' => 'Failed to update user'];
                echo json_encode($results);
            } catch (Exception $e) {
                echo json_encode(['status' => false, 'message' => 'invalid data']);
                error_log(json_encode(['status' => false, 'message' => $e->getMessage()]));
            }
        }

        function getUserDetails(array $data, $auth = null) {
            if (!is_array($data)) {
                throw new Exception('invalid data');
            }

            try {
                $get_details = $this->db->query('SELECT * FROM users WHERE id = :id')->bind($data)->findAll();
                $response = ['status' => true, 'data' => $get_details];

                if (!empty($auth)) {
                    $response['auth'] = $auth;
                }

                echo json_encode($response);
            } catch (Exception $e) {
                echo json_encode(['status' => false, 'message' => 'invalid data']);
                error_log(json_encode(['status' => false, 'message' => $e->getMessage()]));
            }
        }

        function getUserByFirebaseUid(string $firebaseUid) {
            try {
                return $this->db->query('SELECT * FROM users WHERE firebase_uid = :firebase_uid')
                    ->bind(['firebase_uid' => $firebaseUid])
                    ->find();
            } catch (Exception $e) {
                error_log(json_encode(['status' => false, 'message' => $e->getMessage()]));
                return null;
            }
        }

        function deleteUsers(string $id) {
            try {
                $deleted = $this->db->query('DELETE FROM users WHERE id = :id')->bind(['id' => $id])->count();
                $results = ($deleted > 0)
                    ? ['status' => true, 'message' => 'user deleted successfully']
                    : ['status' => false, 'message' => 'user not found'];
                echo json_encode($results);
            } catch (Exception $e) {
                echo json_encode(['status' => false, 'message' => 'invalid data']);
                error_log(json_encode(['status' => false, 'message' => $e->getMessage()]));
            }
        }
   }
?>