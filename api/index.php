<?php
    /*ini_set('display_error', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
    //setting global API headers
    

*/
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json, charset=UTF-8");
    header("Content-Control-Allow-Methods: POST,GET,DELETE,PUT,PATCH,OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers,Authorization,X-Requested-With");


    if($_SERVER['REQUEST_METHOD']==="OPTIONS"){
         http_response_code(200);
         exit();
    }
    //current url path
    $requestUri=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);

    //base path API url

    $baseprefix ="/media/api";

    //strip the prefix from the beginning of the URI
    if(strpos($requestUri,$baseprefix)===0){
          
        //This turns /media/api/users/42 into users/42
        $requestUri = substr($requestUri,strlen($baseprefix));
    }

    //this turns users/42 in ['','users','42']
     //echo '<pre>'.$requestUri.'</pre>';
    $uriSegment = explode('/',trim($requestUri,'/'));
    ///echo '<pre>';

    //print_r($uriSegment);
  //  echo '</pre>';
    $resource = $uriSegment[0]??'';
    $resourcesId =$uriSegment[1]?? null;
    
    $resourceFile = __DIR__.'/resources/' . $resource .'.php';
    
    if(!empty($resource) && file_exists($resourceFile)){
           $method = $_SERVER['REQUEST_METHOD'];
           require_once $resourceFile;
    }else{
         http_response_code(404);
         echo json_encode(["error"=>"Resources not found ","message"=>"The endpoint '/media/api/$resource' does not exist"]);
    }


    