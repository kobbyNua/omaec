<?php
    require __DIR__ . '/../../libs/config/home.php';
    $client=new Home();    
    //$method = $_SERVER['REQUEST_METHOD'];
    //$resourcesId =1;
    //$method ='GET';
    switch($method){
        case 'GET':
            if($resourcesId){
                $client->getClientDetals(['id'=>$resourcesId]);
            }else{
                $client->viewClient();
            }
        break;
        case "POST":
               http_response_code(200);

               $data = json_decode(file_get_contents('php://input'), true);
               if (!is_array($data)) {
                   $data = $_POST;
               }

               if (!is_array($data)) {
                   $data = [];
               }

               $client->addClient($data);
        break;
        case 'PUT':
                http_response_code(200);
                $data=json_decode(file_get_contents('php://input'),true);
                $client->editClient($data, 'id = :id', ['id' => $resourcesId]);
        break;
        default:
              http_response_code(404);
              echo json_encode(['status'=>'error','message'=>"page not found"]);
    }