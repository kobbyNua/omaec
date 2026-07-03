<?php
require_once __DIR__.'/../../libs/Conns.php';

use Kreait\Firebase\JWT\IdTokenVerifier;
use Kreait\Firebase\JWT\Error\IdTokenVerificationFailed;

$api = info();
$projectId = $api['API_KEY'] ?? '';
$adminEmail = trim((string) ($api['ADMIN_EMAIL'] ?? ''));

$authorizationHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

if (function_exists('getallheaders')) {
    $headers = getallheaders();
    if (is_array($headers) && isset($headers['Authorization'])) {
        $authorizationHeader = $headers['Authorization'];
    }
}

$idToken = '';

if (!empty($authorizationHeader) && preg_match('/Bearer\s(\S+)/', $authorizationHeader, $matches)) {
    $idToken = $matches[1];
}

if (empty($projectId) || empty($idToken)) {
    return [
        'authenticated' => false,
        'guest' => true,
        'uid' => null,
        'name' => null,
        'email' => null,
        'is_admin' => false,
        'message' => 'No token provided. Accessing as guest.'
    ];
}

$verifier = IdTokenVerifier::createWithProjectId($projectId);

try {
    $token = $verifier->verifyIdToken($idToken);
    $payload = $token->payload();
    $uid = $payload['sub'] ?? null;
    $name = $payload['name'] ?? null;
    $email = $payload['email'] ?? null;
    $isAdmin = !empty($adminEmail) && !empty($email) && strcasecmp((string) $email, $adminEmail) === 0;

    return [
        'authenticated' => !empty($uid),
        'guest' => empty($uid),
        'uid' => $uid,
        'name' => $name,
        'email' => $email,
        'is_admin' => $isAdmin,
        'message' => 'Authenticated user'
    ];
} catch (IdTokenVerificationFailed $e) {
    return [
        'authenticated' => false,
        'guest' => true,
        'uid' => null,
        'name' => null,
        'email' => null,
        'is_admin' => false,
        'message' => 'Invalid token. Accessing as guest.'
    ];
}
