<?php 
   require __DIR__.'/../query.php';
   require_once __DIR__.'/../uploads.php';

   /*

     CREATE TABLE service_list(
       ID INT(3) NOT NULL AUTO_INCREMENT PRIMARY KEY,
       service_name VARCHAR(150) NOT NULL,
       slug VARCHAR(100) NOT NULL UNIQUE,
       description_body TEXT NOT NULL,

       image_url VARCHAR(255) DEFAULT NULL,
       display_order INT DEFAULT 0,
      is_active TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_team_active_oder(is_active, display_order),
     );
   */
   class Services{
        private $db;

        function __construct(){
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

        function viewServices(){
                $fetch_all = $this->db->execute('SELECT * FROM service_list');
                echo json_encode(['status'=>true,'data'=>$fetch_all->fetchAll()]);
        }

        function addServices($data = []){

            if (!is_array($data) || $data === []) {
                $data = $_POST;
            }

            if (!is_array($data)) {
                throw new InvalidArgumentException("Data must be an array");
            }

            try{
                $uploadFile = null;

                if (isset($_FILES['image_url']) && is_array($_FILES['image_url'])) {
                    $uploadFile = $_FILES['image_url'];
                } elseif (isset($data['image_url']) && is_array($data['image_url'])) {
                    $uploadFile = $data['image_url'];
                }

                if ($uploadFile !== null) {
                    $uploadResult = uploadMediaFile($uploadFile);

                    if (!$uploadResult['success']) {
                        $this->sendJson(['status'=>false,'message'=>$uploadResult['message']]);
                        return;
                    }

                    $data['image_url'] = $this->toPublicPath($uploadResult['path']);
                }

                $requiredFields = ['service_name', 'slug', 'description_body'];
                foreach ($requiredFields as $field) {
                    if (!array_key_exists($field, $data) || trim((string)$data[$field]) === '') {
                        $this->sendJson(['status'=>false,'message'=>'Missing required field: ' . $field]);
                        return;
                    }
                }

                $inserted = $this->db->insert('service_list',$data);
                $results=($inserted) ? ['status'=>true,'message'=>"service details added successfully"] : ['status'=>false,'message'=>"Failed to add service"];
                $this->sendJson($results);
            }
            catch(\Throwable $e){
                $this->sendJson(['status'=>false,'message'=>'invalid data']);
                error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
            }
        }

        function editServices(array $data,string $id,array $where){
         
                 //editService(array $data, string $whereClause, array $whereParams = [])
                 if(!is_array($data)){
                      throw new InvalidArgumentException('invalid data');
                 }

                 try{
                        $update= $this->db->update('service_list',$data,$id,$where);
                        $results = ($update) ? ['status'=>true,'message'=>"service details edited successfully"] : ['status'=>false,'message'=>"Failed to add banner"];
                        echo json_encode($results);
                 }catch(Exception $e){
                                     echo json_encode(['status'=>false,'message'=>"invalid data"]);
                     error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
                 }
        }
        /**
         * 
         * public function editService(array $data, string $whereClause, array $whereParams = []){

                 if(!is_array($data)){
                      throw new InvalidArgumentException('invalid data');
                 }

                 try{
                        $update= $this->db->update('Home_services',$data,$whereClause,$whereParams);
                        $results = ($update) ? ['status'=>true,'message'=>"services edited successfully"] : ['status'=>false,'message'=>"Failed to add banner"];
                        echo json_encode($results);
                 }catch(Exception $e){
                                     echo json_encode(['status'=>false,'message'=>"invalid data"]);
                     error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
                 }
         }*/
         

        function getServiceDetails(array $data)
        {

                 if(!is_array($data)){
                     throw new Exception('invalid data');
                 }
                 try{
                      $get_details = $this->db->query('SELECT * FROM service_list WHERE id=:id')->bind($data)->findAll();
                      echo json_encode(['status'=>true,'data'=>$get_details]);
                 }
                 catch(Exception $e){
                      echo json_encode(['status'=>false,'message'=>"invalid data"]);
                      error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));          
                 }

                
        }
   }
?>