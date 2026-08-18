<?php

require_once __DIR__.'/../libs/Conns.php';
//use Kreait\Firebase\JWT\IdTokenVerifier;
//use Kreait\Firebase\JWT\Error\IdTokenVerificationFailed;

$api=info();
    /*ini_set('display_error', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
    //setting global API headers
    

*/


// -----------------------------------------------------------------------------
// PRODUCTION / cPanel SERVER SECTION
// -----------------------------------------------------------------------------
// On the live cPanel server the frontend is https://omaec.com and the API is
// hosted on https://api.omaec.com. Because the API subdomain points at the
// media directory directly, the base API prefix should be /api.
// Keep this block enabled on the production server.
// The local-development block below is intentionally commented out so it does
// not interfere with your local environment.

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

    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST,GET,DELETE,PUT,PATCH,OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit();
    }

    // Current url path
    $requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

    // Base path API URL on the cPanel server.
    // Example: https://api.omaec.com/api/users => /api/users
    // The same route should also work locally for /api and /media/api.
    $baseprefixes = ['/api', '/media/api'];

    foreach ($baseprefixes as $baseprefix) {
        if (strpos($requestUri, $baseprefix) === 0) {
            // This turns /api/users/42 into users/42
            // or /media/api/users/42 into users/42
            $requestUri = substr($requestUri, strlen($baseprefix));
            break;
        }
    }
} else {
    // -------------------------------------------------------------------------
    // LOCAL DEVELOPMENT SECTION - COMMENTED OUT ON PURPOSE
    // -------------------------------------------------------------------------
    // Uncomment this block only if you are testing the old folder-style URL
    // locally, for example: http://localhost/media/api/users
    //
    // header("Access-Control-Allow-Origin: *");
    // header("Content-Type: application/json; charset=UTF-8");
    // header("Access-Control-Allow-Methods: POST,GET,DELETE,PUT,PATCH,OPTIONS");
    // header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers,Authorization,X-Requested-With");
    //
    // if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    //     http_response_code(200);
    //     exit();
    // }
    //
    // $requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    // $baseprefix = '/media/api';
    //
    // if (strpos($requestUri, $baseprefix) === 0) {
    //     $requestUri = substr($requestUri, strlen($baseprefix));
    // }

    // Use production-safe headers on the cPanel server.
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Credentials: true");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST,GET,DELETE,PUT,PATCH,OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit();
    }

    $requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $baseprefixes = ['/api', '/media/api'];

    foreach ($baseprefixes as $baseprefix) {
        if (strpos($requestUri, $baseprefix) === 0) {
            $requestUri = substr($requestUri, strlen($baseprefix));
            break;
        }
    }
}

    //this turns users/42 in ['','users','42']
     //echo '<pre>'.$requestUri.'</pre>';
    $uriSegment = explode('/',trim($requestUri,'/'));
    ///echo '<pre>';

    //print_r($uriSegment);
  //  echo '</pre>';
    $resource = $uriSegment[0]??'';
    $resourcesId =$uriSegment[1]?? null;
    
    $resourceFile = __DIR__.'/resources/' . $resource .'.php';
    $auth = require_once __DIR__.'/resources/verify.php';
    $GLOBALS['auth'] = is_array($auth) ? $auth : ['authenticated' => false, 'guest' => true, 'uid' => null, 'name' => null, 'email' => null];

    $isGuest = !empty($GLOBALS['auth']['guest']) || empty($GLOBALS['auth']['authenticated']);
    $isUserResource = in_array($resource, ['user', 'users'], true);

    if ($isGuest && $isUserResource) {
        http_response_code(401);
        echo json_encode(['status' => false, 'message' => 'Login required to access user resources']);
        exit;
    }

    if ($isGuest && $_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(401);
        echo json_encode(['status' => false, 'message' => 'Guests can only access GET requests on public resources']);
        exit;
    }
    
    if(!empty($resource) && file_exists($resourceFile)){
           $method = $_SERVER['REQUEST_METHOD'];
           require_once $resourceFile;
    }else{
         http_response_code(404);
         echo json_encode(["error"=>"Resources not found ","message"=>"The endpoint '/api/$resource' does not exist"]);
    }


    