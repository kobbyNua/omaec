<?php 

    require __DIR__.'/../query.php';
    require_once __DIR__.'/../uploads.php';
   /*

         CREATE TABLE media_lists(
       id INT(3) NOT NULL AUTO_INCREMENT PRIMARY KEY,
       title VARCHAR(150) NOT NULL,
       media_type ENUM('image','video','document') default 'image',
       thumbnail_url VARCHAR(255) DEFAULT NULL,
       alt_text VARCHAR(255) DEFAULT NULL,
       file_url VARCHAR(255) NOT NULL,
       display_order INT DEFAULT 0,
       is_active TINYINT DEFAULT 1,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_team_active_oder(is_active, display_order)
     );
   */
   class Media{

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

        private function isValidUrl(string $url): bool{
            return filter_var($url, FILTER_VALIDATE_URL) !== false;
        }

        function viewMedia(){
               
           $fetch_all = $this->db->execute('SELECT * FROM media_lists');
                echo json_encode(['status'=>true,'data'=>$fetch_all->fetchAll()]);
        }

        function addMedia($data = []){

            if (!is_array($data) || $data === []) {
                $data = $_POST;
            }

            if (!is_array($data)) {
                throw new InvalidArgumentException("Data must be an array");
            }

            try{
                $requiredFields = ['title', 'media_type'];
                foreach ($requiredFields as $field) {
                    if (!array_key_exists($field, $data) || trim((string)$data[$field]) === '') {
                        $this->sendJson(['status'=>false,'message'=>'Missing required field: ' . $field]);
                        return;
                    }
                }

                $mediaType = strtolower(trim($data['media_type']));
                $validTypes = ['image', 'video', 'document'];
                if (!in_array($mediaType, $validTypes, true)) {
                    $this->sendJson(['status'=>false,'message'=>'Invalid media_type. Must be: ' . implode(', ', $validTypes)]);
                    return;
                }

                // Normalize file_url when it's a JSON-encoded array or CSV string
                if (isset($data['file_url']) && is_string($data['file_url'])) {
                    $trim = trim($data['file_url']);
                    // JSON array string
                    if (strlen($trim) > 1 && $trim[0] === '[' && substr($trim, -1) === ']') {
                        $decoded = json_decode($trim, true);
                        if (is_array($decoded)) {
                            $data['file_url'] = $decoded;
                        }
                    }
                    // Comma-separated list
                    elseif (strpos($trim, ',') !== false) {
                        $data['file_url'] = array_map('trim', explode(',', $trim));
                    }
                }

                $insertResults = [];

                // Helper to perform insert for one record
                $insertOne = function(array $record) use (&$insertResults) {
                    $ok = $this->db->insert('media_lists', $record);
                    $insertResults[] = $ok ? ['status' => true, 'record' => $record] : ['status' => false, 'record' => $record];
                };

                $multipartFiles = [];
                if (isset($_FILES['file_url']) && is_array($_FILES['file_url']) && is_array($_FILES['file_url']['name'])) {
                    $count = count($_FILES['file_url']['name']);
                    for ($i = 0; $i < $count; $i++) {
                        $fileName = $_FILES['file_url']['name'][$i] ?? '';
                        if ($fileName === '') {
                            continue;
                        }

                        $multipartFiles[] = [
                            'name' => $fileName,
                            'type' => $_FILES['file_url']['type'][$i] ?? '',
                            'tmp_name' => $_FILES['file_url']['tmp_name'][$i] ?? '',
                            'error' => $_FILES['file_url']['error'][$i] ?? UPLOAD_ERR_NO_FILE,
                            'size' => $_FILES['file_url']['size'][$i] ?? 0,
                        ];
                    }
                } elseif (isset($_FILES['file_url']) && !empty($_FILES['file_url']['name'])) {
                    $multipartFiles[] = $_FILES['file_url'];
                } elseif (isset($data['file_url']) && is_array($data['file_url']) && isset($data['file_url']['tmp_name'])) {
                    $multipartFiles[] = $data['file_url'];
                }

                // If files were uploaded via multipart form with multiple files
                if (!empty($multipartFiles)) {
                    $uploadType = in_array($mediaType, ['image', 'video'], true) ? $mediaType : null;
                    foreach ($multipartFiles as $single) {
                        $uploadResult = uploadMediaFile($single, null, $uploadType);
                        if (!$uploadResult['success']) {
                            $insertResults[] = ['status' => false, 'message' => $uploadResult['message'], 'record' => ['title' => $data['title'] ?? null, 'file_url' => $single['name'] ?? '']];
                            continue;
                        }

                        $row = $data;
                        $row['file_url'] = $this->toPublicPath($uploadResult['path']);
                        $insertOne($row);
                    }
                }
                // If file_url provided as array of strings in JSON body
                else if (isset($data['file_url']) && is_array($data['file_url'])) {
                    $projectRoot = dirname(__DIR__);
                    foreach ($data['file_url'] as $fileVal) {
                        $row = $data;
                        $fileVal = is_string($fileVal) ? trim($fileVal) : '';
                        if ($fileVal === '') {
                            continue;
                        }

                        // Resolve to filesystem path and convert to public path when possible
                        if (preg_match('#^https?://#i', $fileVal)) {
                            // remote URL: keep as-is
                            $row['file_url'] = $fileVal;
                        } else {
                            if (strpos($fileVal, '/') === 0) {
                                $fullPath = $projectRoot . '/' . ltrim($fileVal, '/');
                            } elseif (strpos($fileVal, 'uploads/') === 0) {
                                $fullPath = $projectRoot . '/' . ltrim($fileVal, '/');
                            } else {
                                $fullPath = $projectRoot . '/uploads/' . $fileVal;
                            }

                            if (file_exists($fullPath)) {
                                // Convert filesystem path to public path like /uploads/...
                                $row['file_url'] = $this->toPublicPath($fullPath);
                            } else {
                                // If file doesn't exist on disk, fall back to the original value
                                // or attempt to present a public uploads path
                                $row['file_url'] = $this->toPublicPath($fullPath);
                            }
                        }
                        $insertOne($row);
                    }
                }
                // Single-file or single-url handling
                else {
                    if (in_array($mediaType, ['image', 'video'], true)) {
                        $uploadFile = null;
                        if (isset($_FILES['file_url']) && !empty($_FILES['file_url']['name'])) {
                            $uploadFile = $_FILES['file_url'];
                        } elseif (isset($data['file_url']) && is_array($data['file_url']) && isset($data['file_url']['tmp_name'])) {
                            $uploadFile = $data['file_url'];
                        }

                        if ($uploadFile !== null) {
                            $uploadResult = uploadMediaFile($uploadFile, null, $mediaType);
                            if (!$uploadResult['success']) {
                                $this->sendJson(['status'=>false,'message'=>$uploadResult['message']]);
                                return;
                            }
                            $data['file_url'] = $this->toPublicPath($uploadResult['path']);
                        } elseif (isset($data['file_url']) && trim((string)$data['file_url']) !== '') {
                            $fileUrl = trim((string)$data['file_url']);
                            if ($mediaType === 'video' && !$this->isValidUrl($fileUrl)) {
                                $this->sendJson(['status'=>false,'message'=>'Invalid video URL. Must be a valid HTTP/HTTPS URL']);
                                return;
                            }
                        } else {
                            $this->sendJson(['status'=>false,'message'=>ucfirst($mediaType) . ' media type requires file_url (upload) or a valid URL']);
                            return;
                        }
                    } else if ($mediaType === 'document') {
                        if (!isset($data['file_url']) || trim((string)$data['file_url']) === '') {
                            $this->sendJson(['status'=>false,'message'=>'Document media type requires file_url']);
                            return;
                        }
                    }

                    // single insert for non-array case
                    $insertOne($data);
                }

                // Summarize results
                $successCount = 0;
                foreach ($insertResults as $r) {
                    if (!empty($r['status'])) $successCount++;
                }
                if ($successCount === 0) {
                    $this->sendJson(['status'=>false,'message'=>'Failed to add media']);
                } else {
                    $this->sendJson(['status'=>true,'message'=>'media details added successfully','inserted'=>$successCount,'results'=>$insertResults]);
                }
            }
            catch(\Throwable $e){
                $this->sendJson(['status'=>false,'message'=>'invalid data']);
                error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
            }
            

        }

        function getMediaDetails(array $data){

            if(!is_array($data)){
                     throw new Exception('invalid data');
                 }
                 try{
                      $get_details = $this->db->query('SELECT * FROM media_lists WHERE id=:id')->bind($data)->findAll();
                      echo json_encode(['status'=>true,'data'=>$get_details]);
                 }
                 catch(Exception $e){
                      echo json_encode(['status'=>false,'message'=>"invalid data"]);
                      error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));          
                 }

        }


        
   }
?>