<?php 
   require __DIR__.'/../query.php';
   require_once __DIR__.'/../uploads.php';

   /*

    CREATE TABLE events(
       id INT(3) NOT NULL AUTO_INCREMENT PRIMARY KEY,
       title VARCHAR(150) NOT NULL,
       slug VARCHAR(120) NOT NULL UNIQUE,
       description_body TEXT NOT NULL,
       event_date DATETIME NOT NULL,
       location VARCHAR(255) NOT NULL,
       banner_image_url VARCHAR(255) DEFAULT NULL,
       registration_url VARCHAR(255) DEFAULT NULL,
       is_active TINYINT DEFAULT 1,
       live_stream_status ENUM('upcoming', 'live','ended') DEFAULT 'upcoming'
       live_stream_url VARCHAR(255) DEFAULT NULL,
       display_order INT DEFAULT 0,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_team_active_oder(is_active,event_date)
     );

     ALTER TABLE events ADD COLUMN live_stream_status ENUM('upcoming', 'live','ended') DEFAULT 'upcoming';
     ALTER TABLE events ADD COLUMN live_stream_url VARCHAR(255) DEFAULT NULL;
   */
   class Events{
        
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

        function viewEvents(){
                $fetch_all = $this->db->execute('SELECT * FROM events');
                echo json_encode(['status'=>true,'data'=>$fetch_all->fetchAll()]);
        }

        function addEvents($data = []){
            if (!is_array($data)) {
                $rawData = file_get_contents('php://input');
                $decodedData = json_decode($rawData, true);
                $data = is_array($decodedData) ? $decodedData : [];
            }

            if ($data === []) {
                $data = $_POST;
            }

            if (!is_array($data)) {
                throw new InvalidArgumentException("Data must be an array");
            }

            if (isset($_FILES['banner_image_url']) && is_array($_FILES['banner_image_url'])) {
                $data['banner_image_url'] = $_FILES['banner_image_url'];
            } elseif (isset($data['banner_image_url']) && is_array($data['banner_image_url'])) {
                $data['banner_image_url'] = $data['banner_image_url'];
            }

            try {
                $uploadFile = null;

                if (isset($_FILES['banner_image_url']) && is_array($_FILES['banner_image_url']) && !empty($_FILES['banner_image_url']['name'])) {
                    $uploadFile = $_FILES['banner_image_url'];
                } elseif (isset($data['banner_image_url']) && is_array($data['banner_image_url']) && !empty($data['banner_image_url']['name'])) {
                    $uploadFile = $data['banner_image_url'];
                }

                if ($uploadFile !== null) {
                    $uploadResult = uploadMediaFile($uploadFile, null, 'image');

                    if (!$uploadResult['success']) {
                        $this->sendJson(['status' => false, 'message' => $uploadResult['message']]);
                        return;
                    }

                    $data['banner_image_url'] = $this->toPublicPath($uploadResult['path']);
                } elseif (array_key_exists('banner_image_url', $data) && is_array($data['banner_image_url'])) {
                    unset($data['banner_image_url']);
                }

                $requiredFields = ['title', 'slug', 'description_body', 'event_date', 'location'];
                foreach ($requiredFields as $field) {
                    if (!array_key_exists($field, $data) || trim((string) $data[$field]) === '') {
                        $this->sendJson(['status' => false, 'message' => 'Missing required field: ' . $field]);
                        return;
                    }
                }

                foreach ($data as $key => $value) {
                    if (is_array($value) && !isset($value['tmp_name'], $value['name'], $value['error'])) {
                        $this->sendJson(['status' => false, 'message' => 'Invalid value for field: ' . $key]);
                        return;
                    }
                }

                $inserted = $this->db->insert('events', $data);
                $results = ($inserted)
                    ? ['status' => true, 'message' => 'events details added successfully']
                    : ['status' => false, 'message' => 'Failed to add banner'];
                $this->sendJson($results);
            } catch (\Throwable $e) {
                $this->sendJson(['status' => false, 'message' => 'invalid data']);
                error_log(json_encode(['status' => false, 'message' => $e->getMessage()]));
            }
        }

        function editEvents(array $data,string $id,array $where){

              if(!is_array($data)){
                      throw new InvalidArgumentException('invalid data');
                 }

                 try{
                        $update= $this->db->update('events',$data,$id,$where);
                        $results = ($update) ? ['status'=>true,'message'=>"events details edited successfully"] : ['status'=>false,'message'=>"Failed to add banner"];
                        echo json_encode($results);
                 }catch(Exception $e){
                                     echo json_encode(['status'=>false,'message'=>"invalid data"]);
                     error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
                 }

        }

        function getEventsDetails(array $data){

                 if(!is_array($data)){
                     throw new Exception('invalid data');
                 }
                 try{
                      $get_details = $this->db->query('SELECT * FROM events WHERE id=:id')->bind($data)->findAll();
                      echo json_encode(['status'=>true,'data'=>$get_details]);
                 }
                 catch(Exception $e){
                      echo json_encode(['status'=>false,'message'=>"invalid data"]);
                      error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));          
                 }

        }
   }
?>