<?php

require __DIR__.'/../query.php';
require_once __DIR__.'/../uploads.php';
/*
   for view,adding, and editing  about pages
   
   CREATE TABLE about_page_sections(
       id INT(3) AUTO_INCREMENT PRIMARY KEY,
       section_key VARCHAR(50) NOT NULL UNIQUE,
       title VARCHAR(255) NOT NULL,
       subtitle_or_body TEXT DEFAULT NULL,
       display_order INT DEFAULT O ,
       is_active TINYINT(1) DEFAULT 1,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   );

   CREATE TABLE team_members(
      id INT(3) AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(150) NOT NULL,
      job_role VARCHAR(100) NOT NULL,
      photo_url VARCHAR(255) NOT NULL,
      alt_text VARCHAR(150) DEFAULT NULL,

      linkedin_url VARCHAR(255) DEFAULT NULL,
      twitter_url VARCHAR(255) DEFAULT NULL,

      display_order INT DEFAULT 0,
      is_active TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_team_active_oder(is_active, display_order),
   );
*/

class About{

        private $db;
        function __construct()
        {
             $this->db=new Queries();
        }

        private function toPublicPath(?string $path): ?string{
            if (empty($path)) {
                return null;
            }

            $path = str_replace('\\', '/', $path);

            if (preg_match('#^https?://#i', $path)) {
                return $path;
            }

            if (strpos($path, '/uploads/') === 0 || strpos($path, 'uploads/') === 0) {
                return '/' . ltrim($path, '/');
            }

            $projectRoot = dirname(__DIR__);
            $uploadsRoot = $projectRoot . '/uploads';

            if (strpos($path, $uploadsRoot) === 0) {
                return '/' . ltrim(substr($path, strlen($projectRoot)), '/');
            }

            if (file_exists($projectRoot . '/' . ltrim($path, '/'))) {
                return '/' . ltrim($path, '/');
            }

            return $path;
        }

        private function sendJson(array $payload): void{
            echo json_encode($payload);
        }

        function viewAbout(){
          
               $fetch_all = $this->db->execute('SELECT * FROM about_page_sections');
                echo json_encode(['status'=>true,'data'=>$fetch_all->fetchAll()]);

        }

        function editAbout(array $data, string $whereClause, array $whereParams = []){
//editService()
                 if(!is_array($data)){
                      throw new InvalidArgumentException('invalid data');
                 }

                 try{
                        $update= $this->db->update('about_page_sections',$data,$whereClause,$whereParams);
                        $results = ($update) ? ['status'=>true,'message'=>"about details edited successfully"] : ['status'=>false,'message'=>"Failed to add banner"];
                        echo json_encode($results);
                 }catch(Exception $e){
                              echo json_encode(['status'=>false,'message'=>"invalid data"]);
                              error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
                 }


        }

        function AddAbout(array $data){

            if(!is_array($data)){
                    throw new InvalidArgumentException("Data must be an array");
            }

            $requiredFields = ['section_key', 'title'];
            foreach ($requiredFields as $field) {
                if (!array_key_exists($field, $data) || trim((string)$data[$field]) === '') {
                    throw new InvalidArgumentException("Missing required field: " . $field);
                }
            }

            foreach($data as $key=>$value){
                if(is_array($value)){
                     throw new InvalidArgumentException("Invalid value for field: " . $key);
                }
            }

            try{
                $inserted = $this->db->insert('about_page_sections',$data);
                $results=($inserted) ? ['status'=>true,'message'=>"about details added successfully"] : ['status'=>false,'message'=>"Failed to add banner"];
                echo json_encode($results);
            }catch(\Throwable $e){
                echo json_encode(['status'=>false,'message'=>'invalid data']);
                error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
            }

        }

        function getAboutDetails(array $data)
        {



                 if(!is_array($data)){
                     throw new Exception('invalid data');
                 }
                 try{
                      $get_details = $this->db->query('SELECT * FROM about_page_sections WHERE id=:id')->bind($data)->findAll();
                      echo json_encode(['status'=>true,'data'=>$get_details]);
                 }
                 catch(Exception $e){
                      echo json_encode(['status'=>false,'message'=>"invalid data"]);
                      error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));          
                 }

                
        }

        function viewTeam(){
                  $fetch_all = $this->db->execute('SELECT * FROM team_members');
                echo json_encode(['status'=>true,'data'=>$fetch_all->fetchAll()]);

        }

        function editTeam(array $data,string $id, array $where){


                 if(!is_array($data)){
                      throw new InvalidArgumentException('invalid data');
                 }

                 try{
                        $update= $this->db->update('above_sections_page',$data,$id,$where);
                        $results = ($update) ? ['status'=>true,'message'=>"about details edited successfully"] : ['status'=>false,'message'=>"Failed to add banner"];
                        echo json_encode($results);
                 }catch(Exception $e){
                                     echo json_encode(['status'=>false,'message'=>"invalid data"]);
                     error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
                 }

        }

        function addTeam($data = []){

            if (!is_array($data) || $data === []) {
                $data = $_POST;
            }

            if (!is_array($data)) {
                throw new InvalidArgumentException("Data must be an array");
            }

            try{
                $uploadFile = null;

                if (isset($_FILES['photo_url']) && is_array($_FILES['photo_url'])) {
                    $uploadFile = $_FILES['photo_url'];
                } elseif (isset($data['photo_url']) && is_array($data['photo_url'])) {
                    $uploadFile = $data['photo_url'];
                }

                if ($uploadFile !== null) {
                    $uploadResult = uploadMediaFile($uploadFile);

                    if (!$uploadResult['success']) {
                        $this->sendJson(['status'=>false,'message'=>$uploadResult['message']]);
                        return;
                    }

                    $data['photo_url'] = $this->toPublicPath($uploadResult['path']);
                }

                $requiredFields = ['full_name', 'job_role', 'photo_url'];
                foreach ($requiredFields as $field) {
                    if (!array_key_exists($field, $data) || trim((string)$data[$field]) === '') {
                        $this->sendJson(['status'=>false,'message'=>'Missing required field: ' . $field]);
                        return;
                    }
                }

                $inserted = $this->db->insert('team_members',$data);
                $results=($inserted) ? ['status'=>true,'message'=>"team member details added successfully"] : ['status'=>false,'message'=>"Failed to add banner"];
                $this->sendJson($results);
            }catch(\Throwable $e){
                $this->sendJson(['status'=>false,'message'=>'invalid data']);
                error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
            }

        }



        function getTeamDetails(array $data)
        {



                 if(!is_array($data)){
                     throw new Exception('invalid data');
                 }
                 try{
                      $get_details = $this->db->query('SELECT * FROM team_members WHERE id=:id')->bind($data)->findAll();
                      echo json_encode(['status'=>true,'data'=>$get_details]);
                 }
                 catch(Exception $e){
                      echo json_encode(['status'=>false,'message'=>"invalid data"]);
                      error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));          
                 }

                
        }


}


$about=new About();
//$about->viewAbout();


?>