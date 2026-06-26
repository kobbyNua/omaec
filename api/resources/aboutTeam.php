<?php
    require __DIR__ . '/../../libs/config/about.php';
    $about=new About();    
    //$method = $_SERVER['REQUEST_METHOD'];
    //$resourcesId =1;
    //$method ='GET';
    switch($method){
        case 'GET':
            if($resourcesId){
                $about->getTeamDetails(['id'=>$resourcesId]);
            }else{
                $about->viewTeam();
            }
        break;
        case "POST":
               http_response_code(200);
               $data=json_decode(file_get_contents('php://input'),true);
               $about->addTeam($data);
        break;
        case 'PUT':
                http_response_code(200);
                $data=json_decode(file_get_contents('php://input'),true);
                $about->editTeam($data,'id=>:id',['id'=>$resourcesId]);
        break;
        default:
              http_response_code(404);
              echo json_encode(['status'=>'error','message'=>"page not found"]);
    }