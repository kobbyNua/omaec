<?php
    require_once __DIR__.'/../../libs/config/blogs.php';

    $blog = new Blog(new Queries());
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    switch ($method) {
        case 'GET':
            if (!empty($resourcesId)) {
                echo json_encode($blog->getCategoryById((int) $resourcesId));
            } else {
                echo json_encode($blog->getCategory());
            }
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (!is_array($data)) {
                $data = $_POST;
            }
            echo json_encode($blog->addCategory($data));
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            if (!is_array($data)) {
                $data = $_POST;
            }
            if (!empty($resourcesId)) {
                echo json_encode($blog->editCategory((int) $resourcesId, $data));
            } else {
                echo json_encode(['success' => false, 'message' => 'Category id is required']);
            }
            break;

        case 'DELETE':
            if (!empty($resourcesId)) {
                echo json_encode($blog->deleteCategory((int) $resourcesId));
            } else {
                echo json_encode(['success' => false, 'message' => 'Category id is required']);
            }
            break;

        default:
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Unsupported request method']);
    }
