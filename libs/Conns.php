<?php
require __DIR__.'/./cred.php';
 //Database connection in pdo
 class DB{
      
      private static $con;
      private static $instance= null;
      
      private function __construct()
      {     $cred=info();
           //database connection setup in modes 
           try{
                self::$con=new PDO("mysql:host={$cred["HOST"]};dbname={$cred["DB"]};port={$cred["PORT"]}",$cred['USER'],$cred['PASWD']);
                self::$con->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
              // echo 'connection successful';
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