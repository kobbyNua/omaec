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
                     // Build a safe context for logging (do not include plaintext password)
                     $safeCred = $cred;
                     if (isset($safeCred['PASWD'])) {
                          $safeCred['PASWD'] = '*****';
                     }

                     $context = [
                          'time' => date('c'),
                          'host' => $safeCred['HOST'] ?? null,
                          'port' => $safeCred['PORT'] ?? null,
                          'db' => $safeCred['DB'] ?? null,
                          'user' => $safeCred['USER'] ?? null,
                          'error' => $e->getMessage(),
                          'note' => 'Check DB host (127.0.0.1 vs localhost), port, socket path, and MySQL user grants'
                     ];

                     $logMsg = 'DB_CONNECTION_ERROR: ' . json_encode($context);
                     // System error log
                     error_log($logMsg);
                     // Project-level error log (created earlier by index.php when debug enabled)
                     @error_log($logMsg . PHP_EOL, 3, __DIR__ . '/../php-error.log');

                     // Throw a generic exception for upstream handling (do not leak DB details to clients)
                     throw new Exception(json_encode(['error' => 'database connection failed']));
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