<?php
require __DIR__ . '/../../libs/config/user.php';
require __DIR__ . '/../../libs/PasswordResetToken.php';

$method = $_SERVER['REQUEST_METHOD'];
$tokenManager = new PasswordResetToken();

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['token'])) {
        http_response_code(400);
        echo json_encode(['status' => false, 'message' => 'Reset token is required']);
        exit;
    }
    
    // Verify the token
    $tokenData = $tokenManager->verifyToken($data['token']);
    
    if (!$tokenData) {
        http_response_code(400);
        echo json_encode(['status' => false, 'message' => 'Invalid or expired reset token']);
        exit;
    }
    
    if (empty($data['password']) || empty($data['password_confirm'])) {
        http_response_code(400);
        echo json_encode(['status' => false, 'message' => 'Password and password confirmation are required']);
        exit;
    }
    
    if ($data['password'] !== $data['password_confirm']) {
        http_response_code(400);
        echo json_encode(['status' => false, 'message' => 'Passwords do not match']);
        exit;
    }
    
    if (strlen($data['password']) < 8) {
        http_response_code(400);
        echo json_encode(['status' => false, 'message' => 'Password must be at least 8 characters long']);
        exit;
    }
    
    try {
        require __DIR__ . '/../../libs/query.php';
        $db = new Queries();
        
        $hashedPassword = password_hash($data['password'], PASSWORD_BCRYPT);
        
        $updated = $db->update(
            'users',
            ['password' => $hashedPassword],
            'id = :id',
            ['id' => $tokenData['user_id']]
        );
        
        if ($updated) {
            $tokenManager->markTokenAsUsed($data['token']);
            http_response_code(200);
            echo json_encode(['status' => true, 'message' => 'Password updated successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['status' => false, 'message' => 'Failed to update password']);
        }
    } catch (Exception $e) {
        error_log('Password reset error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => false, 'message' => 'An error occurred']);
    }
} 
elseif ($method === 'GET') {
    // Verify token endpoint
    if (empty($_GET['token'])) {
        http_response_code(400);
        echo json_encode(['status' => false, 'message' => 'Reset token is required']);
        exit;
    }
    
    $tokenData = $tokenManager->verifyToken($_GET['token']);
    
    if (!$tokenData) {
        http_response_code(400);
        echo json_encode(['status' => false, 'message' => 'Invalid or expired reset token']);
        exit;
    }
    
    http_response_code(200);
    echo json_encode(['status' => true, 'message' => 'Token is valid', 'user_id' => $tokenData['user_id']]);
} 
else {
    http_response_code(405);
    echo json_encode(['status' => false, 'message' => 'Method not allowed']);
}
?>