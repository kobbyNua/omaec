<?php
    require __DIR__ . '/../../libs/config/home.php';
    $banner=new Home();    
    //$method = $_SERVER['REQUEST_METHOD'];
    //$resourcesId =1;
    //$method ='GET';
    switch($method){
        case 'GET':
            if($resourcesId){
                $banner->getBannerDetails(['id'=>$resourcesId]);
            }else{
                $banner->viewBanner();
            }
        break;
        case "POST":
               http_response_code(200);
               $data=json_decode(file_get_contents('php://input'),true);
               $banner->addBanner($data);
        break;
        case 'PUT':
                http_response_code(200);
                $data=json_decode(file_get_contents('php://input'),true);
                $banner->editBanner($data,'id=>:id',['id'=>$resourcesId]);
        break;
        default:
              http_response_code(404);
              echo json_encode(['status'=>'error','message'=>"page not found"]);
    }