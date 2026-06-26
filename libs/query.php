<?php
   require_once 'Conns.php';
   class Queries{ 
         
        private  ?PDO $pdo=null;
        private ?PDOStatement $stmt=null;
        
         public function __construct()
         {
                 $this->pdo = DB::getConnection();
         }

         public function query(string $sql):self{
                $this->stmt=$this->pdo->prepare($sql);
                return $this;
         }

         public function bind(array $params):self{
               if(!$this->stmt){
                    throw new Exception('empty query');
               }
               $this->stmt->execute($params);
               return $this;


         }
         

         public function find(){
             return $this->stmt->fetch();
         }

         public function findAll():array{
              return $this->stmt->fetchAll($this->pdo::FETCH_ASSOC);
         }


         public function count():int{
              return $this->stmt->rowCount();
         }

         
         public function insert(string $table,array $data):bool{

                $colums = implode(', ',array_keys($data));
                $placeholder_names = array_map(fn($key)=>  ':' . $key,array_keys($data));
                $placeholders = implode(', ',$placeholder_names);
          
                $sql="INSERT INTO {$table} ({$colums}) VALUES ({$placeholders})";
                $this->stmt = $this->pdo->prepare($sql);
                return $this->stmt->execute($data);

                
         }

         public function lastID():bool|string{
            return $this->pdo->lastInsertId();
         }

         public function update(string $table,array $data,string $where, array $whereParams =[]):bool{
                  
              $updateParts =[];
              foreach(array_keys($data) as $columns){
                  $updateParts[]="{$columns} =:{$columns}";
              }
              $updateColumns=implode(', ',$updateParts);
              $sql="UPDATE {$table} SET {$updateColumns} WHERE {$where}";
              $this->stmt = $this->pdo->prepare($sql);
              $mergedParams = array_merge($data,$whereParams);
              return $this->stmt->execute($mergedParams);
         }

         public function execute(string $sql){
             return $this->pdo->query($sql);
         }
   }

   $db= new Queries();
   //$new_records = $db->insert('category',['category_name'=>"men"]);
   
        //$get_records=$db->query('SELECT * FROM category WHERE id = :id')->bind(['id'=>1])->findAll();
       // print_r($get_records);
    //$qur=$db->execute('CREATE TABLE books(id INT(3) NOT NULL AUTO_INCREMENT PRIMARY KEY,names VARCHAR(250) NOT NULL)');
    
    //echo "I am here ".$qur;//if($qur){
     //    echo 'success';
   // }