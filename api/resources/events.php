<?php
    require __DIR__ . '/../../libs/config/events.php';
    $event=new Events();
    
    //$method = $_SERVER['REQUEST_METHOD'];
    //$resourcesId =1;
    //$method ='GET';
    switch($method){
        case 'GET':
            if($resourcesId){
                $event->getEventsDetails(['id'=>$resourcesId]);
            }else{
                $event->viewEvents();
            }
        break;
        case "POST":
               http_response_code(200);
               $data=json_decode(file_get_contents('php://input'),true);
               $event->addEvents($data);
        break;
        case 'PUT':
                http_response_code(200);
                $data=json_decode(file_get_contents('php://input'),true);
                $event->editEvents($data,'id=>:id',['id'=>$resourcesId]);
        break;
        default:
              http_response_code(404);
              echo json_encode(['status'=>'error','message'=>"page not found"]);
    }