<?php
    require __DIR__ . '/../../libs/config/home.php';
    $achievemnts=new Home();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $resourcesId = $_GET['id'] ?? null;

    switch($method){
        case 'GET':
            if($resourcesId){
                $achievemnts->getAchievementDetalis(['id'=>$resourcesId]);
            }else{
                $achievemnts->viewAchievement();
            }
        break;
        case "POST":
               http_response_code(200);
               $rawData = file_get_contents('php://input');
               $data = json_decode($rawData, true);
               if (!is_array($data)) {
                   $data = $_POST;
               }
               $data = is_array($data) ? $data : [];
               $achievemnts->addAchievements($data);
        break;
        case 'PUT':
               /* $rawData = file_get_contents('php://input');
                $data = json_decode($rawData, true);
                if (!is_array($data)) {
                    $data = $_POST;
                }
                $data = is_array($data) ? $data : [];

                if (empty($resourcesId)) {
                    http_response_code(400);
                    echo json_encode(['status'=>false,'message'=>'Achievement ID is required']);
                    break;
                }

                if (empty($data)) {
                    http_response_code(400);
                    echo json_encode(['status'=>false,'message'=>'No update data provided']);
                    break;
                }*/

              

                http_response_code(200);
                              //  http_response_code(200);
                $data=json_decode(file_get_contents('php://input'),true);
                $data = is_array($data) ? $data : [];
                $achievemnts->editAchievement($data, 'id = :id', ['id'=>$resourcesId]);
        break;
        default:
              http_response_code(404);
              echo json_encode(['status'=>'error','message'=>"page not found"]);
    }

    