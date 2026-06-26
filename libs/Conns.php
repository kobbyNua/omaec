<?php

 //Database connection in pdo
 class DB{
      
      private static $con;
      private static $instance= null;
      public string $host='127.0.0.1';
      private string $db='';
      private string $port='3306';
      private string $user='root';
      private string $passwd='gladysmElvis@1';

      private function __construct()
      {
           //database connection setup in modes 
           try{
                self::$con=new PDO("mysql:host=127.0.0.1;dbname=media;port=3306",'root','gladysmElvis@1');
                self::$con->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
               //echo 'connection successful';
           }
           catch(PDOException $e){
                 error_log('connection failed because '.$e->getMessage());
                 throw new Exception(json_encode(['error'=>'databas connection failed']));
                 //error_log('connection failed because '.$e->getMessage());
           }
      }

      public static function getConnection(){
           
          if(self::$instance===null){
               self::$instance = new self();
          }
          return self::$con;

           

      } 

      public function __clone()
      {
        throw new \Exception('Not implemented');
      }

      public function __wakeup()
      {
        throw new \Exception('Not implemented');
      }
 }

 DB::getConnection();