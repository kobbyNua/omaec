<?php

require_once __DIR__.'/../libs/Conns.php';

$api = info();

// -----------------------------------------------------------------------------
// ENVIRONMENT & CORS HANDLING
// -----------------------------------------------------------------------------
$isLocalHost = isset($_SERVER['HTTP_HOST']) && (
    strpos($_SERVER['HTTP_HOST'], 'localhost') !== false ||
    strpos($_SERVER['HTTP_HOST'], '127.0.0.1') !== false ||
    strpos($_SERVER['HTTP_HOST'], '::1') !== false
);

if (!$isLocalHost) {
    $allowedOrigins = [
        'https://omaec.com',
        'https://www.omaec.com'
    ];

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (in_array($origin, $allowedOrigins, true)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
        header("Vary: Origin");
    } else {
        header("Access-Control-Allow-Origin: https://omaec.com");
        header("Access-Control-Allow-Credentials: true");
    }
} else {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Credentials: true");
}

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST,GET,DELETE,PUT,PATCH,OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// -----------------------------------------------------------------------------
// ROUTING & URI PARSING
// -----------------------------------------------------------------------------
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

$baseprefixes = ['/api', '/media/api'];

foreach ($baseprefixes as $baseprefix) {
    if (strpos($requestUri, $baseprefix) === 0) {
        $requestUri = substr($requestUri, strlen($baseprefix));
        break;
    }
}

// Parses 'users/42' into ['users', '42']
$uriSegment = explode('/', trim($requestUri, '/'));

$resource = $uriSegment[0] ?? '';
$resourcesId = $uriSegment[1] ?? null;

// -----------------------------------------------------------------------------
// AUTHENTICATION & GUEST ACCESS CONTROL
// -----------------------------------------------------------------------------
$resourceFile = __DIR__ . '/resources/' . $resource . '.php';
$auth = require_once __DIR__ . '/resources/verify.php';

$GLOBALS['auth'] = is_array($auth) ? $auth : [
    'authenticated' => false,
    'guest' => true,
    'uid' => null,
    'name' => null,
    'email' => null
];

$isGuest = !empty($GLOBALS['auth']['guest']) || empty($GLOBALS['auth']['authenticated']);
$isUserResource = in_array($resource, ['user', 'users'], true);

// Guest Rule 1: Cannot access 'user' or 'users' resources
if ($isGuest && $isUserResource) {
    http_response_code(401);
    echo json_encode(['status' => false, 'message' => 'Login required to access user resources']);
    exit;
}

// Guest Rule 2: Guests can only make non-ID GET requests
if ($isGuest && ($_SERVER['REQUEST_METHOD'] !== 'GET' || !empty($resourcesId))) {
    http_response_code(401);
    echo json_encode(['status' => false, 'message' => 'Guests can only access GET requests without an id']);
    exit;
}

// -----------------------------------------------------------------------------
// DISPATCH TO RESOURCE FILE
// -----------------------------------------------------------------------------
if (!empty($resource) && file_exists($resourceFile)) {
    $method = $_SERVER['REQUEST_METHOD'];
    require_once $resourceFile;
} else {
    http_response_code(404);
    echo json_encode([
        "error" => "Resources not found ",
        "message" => "The endpoint '/api/$resource' does not exist"
    ]);
}