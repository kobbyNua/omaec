<?php
    require __DIR__ . '/../../libs/config/home.php';
    $services=new Home();    
    //$method = $_SERVER['REQUEST_METHOD'];
    //$resourcesId =1;
    //$method ='GET';
    switch($method){
        case 'GET':
            if($resourcesId){
                $services->getServiceDetail(['id'=>$resourcesId]);
            }else{
                $services->viewService();
            }
        break;
        case "POST":
               http_response_code(200);
               $data=json_decode(file_get_contents('php://input'),true);
               $services->addService($data);
        break;
        case 'PUT':
                http_response_code(200);
                $data=json_decode(file_get_contents('php://input'),true);
                $services->editService($data,'id=>:id',['id'=>$resourcesId]);
        break;
        default:
              http_response_code(404);
              echo json_encode(['status'=>'error','message'=>"page not found"]);
    }