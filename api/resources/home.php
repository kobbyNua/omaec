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
               $rawData = file_get_contents('php://input');
               $jsonData = json_decode($rawData, true);
               $data = is_array($jsonData) ? $jsonData : [];

               if (!empty($_POST)) {
                   $data = array_merge($data, $_POST);
               }

               if (!empty($_FILES)) {
                   $data = array_merge($data, $_FILES);
               }

               $banner->addBanner($data);
        break;
        case 'PUT':
                http_response_code(200);
                $rawData = file_get_contents('php://input');
                $jsonData = json_decode($rawData, true);
                $data = is_array($jsonData) ? $jsonData : [];
                $banner->editBanner($data, 'id = :id', ['id' => $resourcesId]);
        break;
        default:
              http_response_code(404);
              echo json_encode(['status'=>'error','message'=>"page not found"]);
    }