<?php
    require __DIR__ . '/../../libs/config/user.php';
    $auth = require __DIR__ . '/verify.php';
    $user = new Users();

    switch ($method) {
        case 'GET':
            if (!empty($resourcesId)) {
                $user->getUserDetails(['id' => $resourcesId], $auth);
            } else {
                $user->viewUsers($auth);
            }
            break;

        case 'POST':
            if (empty($auth['authenticated'])) {
                http_response_code(401);
                echo json_encode(['status' => false, 'message' => 'Login required to create a user profile']);
                break;
            }

            if (empty($auth['is_admin'])) {
                http_response_code(403);
                echo json_encode(['status' => false, 'message' => 'Only the admin account can create users']);
                break;
            }

            http_response_code(200);
            $data = json_decode(file_get_contents('php://input'), true);
            $user->addUsers($data, $auth);
            break;

        case 'PUT':
            if (empty($auth['authenticated'])) {
                http_response_code(401);
                echo json_encode(['status' => false, 'message' => 'Login required to update a user profile']);
                break;
            }

            http_response_code(200);
            $data = json_decode(file_get_contents('php://input'), true);
            $user->editUsers($data, (string) $resourcesId, $auth);
            break;

        case 'DELETE':
            if (empty($auth['authenticated'])) {
                http_response_code(401);
                echo json_encode(['status' => false, 'message' => 'Login required to delete a user profile']);
                break;
            }

            http_response_code(200);
            if (!empty($resourcesId)) {
                $user->deleteUsers((string) $resourcesId);
            } else {
                echo json_encode(['status' => false, 'message' => 'user id is required']);
            }
            break;

        default:
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'page not found']);
    }