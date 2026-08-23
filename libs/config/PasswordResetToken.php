<?php

require_once __DIR__ . '/../query.php';

class PasswordResetToken
{
    private $db;

    public function __construct()
    {
        $this->db = new Queries();
    }

    /**
     * Generate a password reset token
     * @param int $userId
     * @return array ['token' => token, 'expires_at' => timestamp]
     */
    public function generateToken($userId)
    {
        try {
            $token = bin2hex(random_bytes(32));
            $expiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));

            $data = [
                'user_id' => $userId,
                'token' => $token,
                'expires_at' => $expiresAt,
                'used' => 0,
                'created_at' => date('Y-m-d H:i:s')
            ];

            $this->db->insert('password_reset_tokens', $data);

            return [
                'success' => true,
                'token' => $token,
                'expires_at' => $expiresAt
            ];
        } catch (Exception $e) {
            error_log('Token generation failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to generate token'];
        }
    }

    /**
     * Verify and get token details
     * @param string $token
     * @return array|false
     */
    public function verifyToken($token)
    {
        try {
            $result = $this->db->query(
                'SELECT * FROM password_reset_tokens WHERE token = :token AND used = 0 AND expires_at > NOW()'
            )->bind(['token' => $token])->find();

            return $result ?: false;
        } catch (Exception $e) {
            error_log('Token verification failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Mark token as used
     * @param string $token
     * @return bool
     */
    public function markTokenAsUsed($token)
    {
        try {
            return $this->db->update(
                'password_reset_tokens',
                ['used' => 1, 'used_at' => date('Y-m-d H:i:s')],
                'token = :token',
                ['token' => $token]
            );
        } catch (Exception $e) {
            error_log('Failed to mark token as used: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Clean up expired tokens
     * @return int Number of deleted tokens
     */
    public function cleanupExpiredTokens()
    {
        try {
            return $this->db->query('DELETE FROM password_reset_tokens WHERE expires_at < NOW()')->count();
        } catch (Exception $e) {
            error_log('Token cleanup failed: ' . $e->getMessage());
            return 0;
        }
    }
}
?>