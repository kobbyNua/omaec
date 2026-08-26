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

        private function normalizePortfolioMediaValue($value) {
            if ($value === null || $value === '') {
                return null;
            }

            if (is_string($value)) {
                $trimmed = trim($value);
                if ($trimmed === '') {
                    return null;
                }

                $decoded = json_decode($trimmed, true);
                if (is_array($decoded)) {
                    return array_map(function ($item) {
                        $item = trim((string)$item);
                        return $item === '' ? null : $this->toPublicPath($item);
                    }, $decoded);
                }

                return $this->toPublicPath($trimmed);
            }

            if (is_array($value)) {
                $normalized = [];
                foreach ($value as $item) {
                    if (is_string($item)) {
                        $converted = $this->toPublicPath(trim($item));
                        if ($converted !== null && $converted !== '') {
                            $normalized[] = $converted;
                        }
                    }
                }

                return $normalized;
            }

            return $this->toPublicPath((string)$value);
        }

        private function resolvePortfolioUploadFile(array $data): ?array{
            $fileKeys = ['cover_image_url', 'portfolio_files', 'gallery_files', 'media_files', 'files', 'project_files', 'image_url', 'video_url', 'file_url'];

            foreach ($fileKeys as $key) {
                if (isset($_FILES[$key]) && is_array($_FILES[$key]) && (!empty($_FILES[$key]['name']) || (isset($_FILES[$key]['name']) && is_array($_FILES[$key]['name']) && !empty(array_filter($_FILES[$key]['name']))))) {
                    return $_FILES[$key];
                }
            }

            foreach ($fileKeys as $key) {
                if (isset($data[$key]) && is_array($data[$key]) && (isset($data[$key]['tmp_name']) || (isset($data[$key]['name']) && is_array($data[$key]['name']) && !empty(array_filter($data[$key]['name']))))) {
                    return $data[$key];
                }
            }

            return null;
        }

        private function detectPortfolioUploadType(array $file): ?string{
            $mimeType = strtolower((string)($file['type'] ?? ''));
            if (stripos($mimeType, 'video/') === 0) {
                return 'video';
            }
            if (stripos($mimeType, 'image/') === 0) {
                return 'image';
            }

            $fileName = (string)($file['name'] ?? '');
            $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
            if (in_array($extension, ['mp4', 'mov', 'avi', 'mkv', 'webm'], true)) {
                return 'video';
            }
            if (in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp'], true)) {
                return 'image';
            }

            return null;
        }

        private function handlePortfolioUploads(array &$data): bool{
            $uploadFile = $this->resolvePortfolioUploadFile($data);

            if ($uploadFile === null) {
                return false;
            }

            $uploadType = $this->detectPortfolioUploadType(is_array($uploadFile) && isset($uploadFile['name']) && !is_array($uploadFile['name']) ? $uploadFile : ['name' => '', 'type' => '']);
            $uploadResult = uploadMediaFile($uploadFile, null, $uploadType);

            if (!$uploadResult['success']) {
                $this->sendJson(['status' => false, 'message' => $uploadResult['message']]);
                return true;
            }

            $uploadedPaths = $uploadResult['path'];
            if (is_array($uploadedPaths)) {
                $publicPaths = array_values(array_filter(array_map(function ($path) {
                    return $this->toPublicPath((string)$path);
                }, $uploadedPaths)));
                $data['cover_image_url'] = json_encode($publicPaths, JSON_UNESCAPED_SLASHES);
                return true;
            }

            $data['cover_image_url'] = $this->toPublicPath((string)$uploadedPaths);
            return true;
        }

        private function formatPortfolioItem(array $item): array{
            if (!empty($item['cover_image_url'])) {
                $decodedValue = json_decode((string)$item['cover_image_url'], true);
                if (is_array($decodedValue)) {
                    $item['cover_image_url'] = array_values(array_filter(array_map(function ($value) {
                        return $this->toPublicPath((string)$value);
                    }, $decodedValue)));
                } else {
                    $item['cover_image_url'] = $this->toPublicPath((string)$item['cover_image_url']);
                }
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
                if (isset($data['cover_image_url']) && is_array($data['cover_image_url']) && !isset($data['cover_image_url']['tmp_name'])) {
                    $data['cover_image_url'] = json_encode(array_values(array_filter(array_map(function ($value) {
                        return is_string($value) ? $this->toPublicPath(trim($value)) : null;
                    }, $data['cover_image_url']))), JSON_UNESCAPED_SLASHES);
                }

                $this->handlePortfolioUploads($data);

                $requiredFields = ['project_name', 'slug', 'client_name', 'project_summary', 'project_details', 'completion_date', 'project_url'];
                foreach ($requiredFields as $field) {
                    if (!array_key_exists($field, $data) || trim((string) $data[$field]) === '') {
                        $this->sendJson(['status' => false, 'message' => 'Missing required field: ' . $field]);
                        return;
                    }
                }

                foreach ($data as $key => $value) {
                    if (is_array($value) && !isset($value['tmp_name'], $value['name'], $value['error']) && !empty($value)) {
                        $data[$key] = json_encode($this->normalizePortfolioMediaValue($value), JSON_UNESCAPED_SLASHES);
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
                        if (isset($data['cover_image_url']) && is_array($data['cover_image_url']) && !isset($data['cover_image_url']['tmp_name'])) {
                            $data['cover_image_url'] = json_encode(array_values(array_filter(array_map(function ($value) {
                                return is_string($value) ? $this->toPublicPath(trim($value)) : null;
                            }, $data['cover_image_url']))), JSON_UNESCAPED_SLASHES);
                        }

                        $this->handlePortfolioUploads($data);

                        foreach ($data as $key => $value) {
                            if (is_array($value) && !isset($value['tmp_name'], $value['name'], $value['error']) && !empty($value)) {
                                $data[$key] = json_encode($this->normalizePortfolioMediaValue($value), JSON_UNESCAPED_SLASHES);
                            }
                        }

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