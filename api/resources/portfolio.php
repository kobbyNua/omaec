<?php
    require __DIR__ . '/../../libs/config/portfolio.php';
    $portfolio=new Portfolio();
    
    //$method = $_SERVER['REQUEST_METHOD'];
    //$resourcesId =1;
    //$method ='GET';
    switch($method){
        case 'GET':
            if($resourcesId){
                $portfolio->getPorfolioDetails(['id'=>$resourcesId]);
            }else{
                $portfolio->viewPortfolio();
            }
        break;
        case "POST":
               http_response_code(200);
               $data=json_decode(file_get_contents('php://input'),true);
               $portfolio->addPortfolio($data);
        break;
        case 'PUT':
                http_response_code(200);
                $data=json_decode(file_get_contents('php://input'),true);
                $portfolio->editPortfolio($data,'id=>:id',['id'=>$resourcesId]);
        break;
        default:
              http_response_code(404);
              echo json_encode(['status'=>'error','message'=>"page not found"]);
    }