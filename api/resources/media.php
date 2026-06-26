<?php
    require __DIR__ . '/../../libs/config/media.php';
    $media=new Media();
    
    //$method = $_SERVER['REQUEST_METHOD'];
    //$resourcesId =1;
    //$method ='GET';
    switch($method){
        case 'GET':
            if($resourcesId){
                $media->getMediaDetails(['id'=>$resourcesId]);
            }else{
                $media->viewMedia();
            }
        break;
        case "POST":
               http_response_code(200);
               $data=json_decode(file_get_contents('php://input'),true);
               $media->addMedia($data);
        break;
        case 'PUT':
                http_response_code(200);
                $data=json_decode(file_get_contents('php://input'),true);
                $media->editMedia($data,'id=>:id',['id'=>$resourcesId]);
        break;
        default:
              http_response_code(404);
              echo json_encode(['status'=>'error','message'=>"page not found"]);
    }