<?php 
     require __DIR__.'/../query.php';
     require_once __DIR__.'/../uploads.php';

   /*

    CREATE TABLE portfolio(
       id INT(3) NOT NULL AUTO_INCREMENT PRIMARY KEY,
       project_name VARCHAR(150) NOT NULL,
       slug VARCHAR(120) NOT NULL UNIQUE,
       client_name VARCHAR(150) NOT NULL,
       project_summary TEXT NOT NULL,
       project_details LONGTEXT NOT NULL,
       completion_date DATETIME NOT NULL,
       project_url VARCHAR(255) NOT NULL,

       cover_image_url VARCHAR(255) DEFAULT NULL,
       display_order INT DEFAULT 0,
       is_active TINYINT DEFAULT 1,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_PORTFOLIO_SORT(is_active,DISPLAY_ORDER)
     );
   */
   class Portfolio{
        private $db;

        function __construct(){
             $this->db = new Queries();
        }

        private function ensureDb(): void{
            if (!($this->db instanceof Queries)) {
                $this->db = new Queries();
            }
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

        private function formatPortfolioItem(array $item): array{
            if (!empty($item['cover_image_url'])) {
                $item['cover_image_url'] = $this->toPublicPath($item['cover_image_url']);
            }
            return $item;
        }

        function viewPortfolio(){
                $this->ensureDb();
                $fetch_all = $this->db->execute('SELECT * FROM  portfolio');
                $items = $fetch_all->fetchAll(PDO::FETCH_ASSOC);
                $items = array_map([$this, 'formatPortfolioItem'], $items);
                echo json_encode(['status'=>true,'data'=>$items]);
        }

        function addPortfolio($data = []){
                $this->ensureDb();
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

            try {
                $uploadFile = null;

                if (isset($_FILES['cover_image_url']) && is_array($_FILES['cover_image_url']) && !empty($_FILES['cover_image_url']['name'])) {
                    $uploadFile = $_FILES['cover_image_url'];
                } elseif (isset($data['cover_image_url']) && is_array($data['cover_image_url']) && !empty($data['cover_image_url']['name'])) {
                    $uploadFile = $data['cover_image_url'];
                }

                if ($uploadFile !== null) {
                    $uploadResult = uploadMediaFile($uploadFile, null, 'image');

                    if (!$uploadResult['success']) {
                        $this->sendJson(['status' => false, 'message' => $uploadResult['message']]);
                        return;
                    }

                    $data['cover_image_url'] = $this->toPublicPath($uploadResult['path']);
                } elseif (array_key_exists('cover_image_url', $data) && is_array($data['cover_image_url'])) {
                    unset($data['cover_image_url']);
                }

                $requiredFields = ['project_name', 'slug', 'client_name', 'project_summary', 'project_details', 'completion_date', 'project_url'];
                foreach ($requiredFields as $field) {
                    if (!array_key_exists($field, $data) || trim((string) $data[$field]) === '') {
                        $this->sendJson(['status' => false, 'message' => 'Missing required field: ' . $field]);
                        return;
                    }
                }

                foreach ($data as $key => $value) {
                    if (is_array($value) && !isset($value['tmp_name'], $value['name'], $value['error'])) {
                        $this->sendJson(['status' => false, 'message' => 'Invalid key or value for field: ' . $key]);
                        return;
                    }
                }

                $inserted = $this->db->insert('portfolio', $data);
                $results = ($inserted)
                    ? ['status' => true, 'message' => 'portfolio details added successfully']
                    : ['status' => false, 'message' => 'Failed to add portfolio'];
                $this->sendJson($results);
            } catch (\Throwable $e) {
                $this->sendJson(['status' => false, 'message' => 'invalid data']);
                error_log(json_encode(['status' => false, 'message' => $e->getMessage()]));
            }
        }

        function editPortfolio(array $data,string $id,array $where)
        {
               
                 if(!is_array($data)){
                      throw new InvalidArgumentException('invalid data');
                 }

                 $this->ensureDb();

                 try{
                        $update= $this->db->update('portfolio',$data,$id,$where);
                        $results = ($update) ? ['status'=>true,'message'=>"portfolio details edited successfully"] : ['status'=>false,'message'=>"Failed to add banner"];
                        echo json_encode($results);
                 }catch(Exception $e){
                                     echo json_encode(['status'=>false,'message'=>"invalid data"]);
                     error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
                 }   

        }

        function getPorfolioDetails(array $data){

               if(!is_array($data)){
                     throw new Exception('invalid data');
                 }
                 try{
                      $this->ensureDb();
                $get_details = $this->db->query('SELECT * FROM portfolio WHERE id=:id')->bind($data)->findAll();
                $details = array_map([$this, 'formatPortfolioItem'], $get_details);
                      echo json_encode(['status'=>true,'data'=>$details]);
                 }
                 catch(Exception $e){
                      echo json_encode(['status'=>false,'message'=>"invalid data"]);
                      error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));          
                 }


        }
   }
?>