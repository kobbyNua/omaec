<?php
    require __DIR__ . '/../../libs/config/services.php';
    $service=new Services();
    
    //$method = $_SERVER['REQUEST_METHOD'];
    //$resourcesId =1;
    //$method ='GET';
    switch($method){
        case 'GET':
            if($resourcesId){
                $service->getServiceDetails(['id'=>$resourcesId]);
            }else{
                $service->viewServices();
            }
        break;
        case "POST":
               http_response_code(200);
               $data = json_decode(file_get_contents('php://input'), true);
               if (!is_array($data) || $data === []) {
                   $data = $_POST;
               }
               if (!is_array($data)) {
                   $data = [];
               }
               $service->addServices($data);
        break;
        case 'PUT':
                http_response_code(200);
                $data = json_decode(file_get_contents('php://input'), true);
                if (!is_array($data) || $data === []) {
                    $data = $_POST;
                }
                if (!is_array($data)) {
                    $data = [];
                }
                $service->editServices($data, 'id = :id', ['id' => $resourcesId]);
        break;
        default:
              http_response_code(404);
              echo json_encode(['status'=>'error','message'=>"page not found"]);
    }