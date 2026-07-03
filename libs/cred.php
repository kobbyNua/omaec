<?php

    require_once __DIR__.'/../vendor/autoload.php';
    $env =Dotenv\Dotenv::createMutable(__DIR__.'/../');
    $env->load();
    
    function info(){
         $credentials = 
         [
            "USER"=>$_ENV['DB_USER'],
            "DB"=>$_ENV['DB_NAME'],
            "PORT"=>$_ENV['DB_PORT'],
            "PASWD"=>$_ENV['DB_PSWD'],
            "HOST"=>$_ENV['DB_HOST'],
            "API_KEY"=>$_ENV['API_KEY'],
            "ADMIN_EMAIL"=>$_ENV['ADMIN_EMAIL'] ?? ''
         ];

         return $credentials;

    }