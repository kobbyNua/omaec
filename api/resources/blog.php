<?php
    require_once __DIR__.'/../../libs/config/blogs.php';

    $blog = new Blog(new Queries());
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    switch ($method) {
        case 'GET':
            if (!empty($resourcesId)) {
                echo json_encode($blog->get((int) $resourcesId));
            } else {
                echo json_encode($blog->get());
            }
            break;

        case 'POST':
            $data = $_POST;
            if (empty($data)) {
                $rawBody = file_get_contents('php://input');
                if (!empty($rawBody)) {
                    $decoded = json_decode($rawBody, true);
                    if (is_array($decoded)) {
                        $data = $decoded;
                    }
                }
            }

            echo json_encode($blog->create($data, $_FILES));
            break;

        case 'PUT':
            $data = $_POST;
            if (empty($data)) {
                $rawBody = file_get_contents('php://input');
                if (!empty($rawBody)) {
                    $decoded = json_decode($rawBody, true);
                    if (is_array($decoded)) {
                        $data = $decoded;
                    }
                }
            }

            if (!empty($resourcesId)) {
                echo json_encode($blog->edit((int) $resourcesId, $data, $_FILES));
            } else {
                echo json_encode(['success' => false, 'message' => 'Post id is required']);
            }
            break;

        default:
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Unsupported request method']);
    }
