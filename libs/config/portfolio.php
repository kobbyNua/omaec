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

     CREATE TABLE portfolio_media(
        id INT(3) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        portfolio_id INT(3) NOT NULL,
        media_type ENUM('image','video') NOT NULL,
        media_url VARCHAR(255) NOT NULL,
        display_order INT DEFAULT 0,
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_PORTFOLIO_MEDIA_SORT(portfolio_id,is_active,DISPLAY_ORDER),
        FOREIGN KEY (portfolio_id) REFERENCES portfolio(id) ON DELETE CASCADE
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

        private function normalizeMediaList($value): array{
            if ($value === null || $value === '') {
                return [];
            }

            if (is_string($value)) {
                $trimmed = trim($value);
                if ($trimmed === '') {
                    return [];
                }

                $decoded = json_decode($trimmed, true);
                if (is_array($decoded)) {
                    return $this->normalizeMediaList($decoded);
                }

                if (strpos($trimmed, ',') !== false) {
                    return $this->normalizeMediaList(array_map('trim', explode(',', $trimmed)));
                }

                $publicPath = $this->toPublicPath($trimmed);
                return $publicPath !== null && $publicPath !== '' ? [$publicPath] : [];
            }

            if (is_array($value)) {
                $items = [];
                foreach ($value as $entry) {
                    if (is_string($entry)) {
                        $normalized = $this->normalizeMediaList($entry);
                        foreach ($normalized as $url) {
                            $items[] = $url;
                        }
                    } elseif (is_array($entry) && isset($entry['media_url'])) {
                        $normalized = $this->normalizeMediaList($entry['media_url']);
                        foreach ($normalized as $url) {
                            $items[] = $url;
                        }
                    }
                }

                $items = array_values(array_unique(array_filter($items, fn($item) => $item !== null && $item !== '')));
                return $items;
            }

            return [];
        }

        private function flattenUploadedFiles($value): array{
            if (!is_array($value)) {
                return [];
            }

            if (isset($value['name']) && !is_array($value['name'])) {
                if (trim((string)$value['name']) === '') {
                    return [];
                }
                return [$value];
            }

            $files = [];
            $names = $value['name'] ?? [];
            $count = is_array($names) ? count($names) : 0;

            for ($i = 0; $i < $count; $i++) {
                $name = $names[$i] ?? '';
                if ($name === '') {
                    continue;
                }

                $files[] = [
                    'name' => $name,
                    'type' => $value['type'][$i] ?? '',
                    'tmp_name' => $value['tmp_name'][$i] ?? '',
                    'error' => $value['error'][$i] ?? UPLOAD_ERR_NO_FILE,
                    'size' => $value['size'][$i] ?? 0,
                ];
            }

            return $files;
        }

        private function extractPortfolioRow(array $data): array{
            $allowed = ['project_name', 'slug', 'client_name', 'project_summary', 'project_details', 'completion_date', 'project_url', 'cover_image_url', 'display_order', 'is_active'];
            $row = [];

            foreach ($allowed as $field) {
                if (array_key_exists($field, $data)) {
                    $row[$field] = $data[$field];
                }
            }

            if (isset($row['cover_image_url']) && is_array($row['cover_image_url']) && !isset($row['cover_image_url']['tmp_name'])) {
                $normalized = $this->normalizeMediaList($row['cover_image_url']);
                $row['cover_image_url'] = !empty($normalized) ? $normalized[0] : null;
            }

            if (array_key_exists('cover_image_url', $row) && !empty($row['cover_image_url']) && is_string($row['cover_image_url'])) {
                $row['cover_image_url'] = $this->toPublicPath($row['cover_image_url']);
            }

            return $row;
        }

        private function resolvePortfolioMediaUrls(array $data): array{
            $mediaUrls = [];
            $fileKeys = ['media_url', 'cover_image_url', 'portfolio_files', 'gallery_files', 'media_files', 'files', 'project_files', 'file_url'];

            foreach ($fileKeys as $key) {
                if (isset($_FILES[$key])) {
                    foreach ($this->flattenUploadedFiles($_FILES[$key]) as $file) {
                        $uploadResult = uploadMediaFile($file, null, null);
                        if (!$uploadResult['success']) {
                            throw new RuntimeException($uploadResult['message']);
                        }
                        $mediaUrls[] = $this->toPublicPath((string)$uploadResult['path']);
                    }
                }

                if (!array_key_exists($key, $data)) {
                    continue;
                }

                $value = $data[$key];
                if (is_array($value) && isset($value['tmp_name']) && is_string($value['tmp_name'])) {
                    $uploadResult = uploadMediaFile($value, null, null);
                    if (!$uploadResult['success']) {
                        throw new RuntimeException($uploadResult['message']);
                    }
                    $mediaUrls[] = $this->toPublicPath((string)$uploadResult['path']);
                    continue;
                }

                if (is_array($value) && (!isset($value['tmp_name']) || is_array($value['tmp_name']))) {
                    foreach ($this->flattenUploadedFiles($value) as $file) {
                        $uploadResult = uploadMediaFile($file, null, null);
                        if (!$uploadResult['success']) {
                            throw new RuntimeException($uploadResult['message']);
                        }
                        $mediaUrls[] = $this->toPublicPath((string)$uploadResult['path']);
                    }
                    $mediaUrls = array_merge($mediaUrls, $this->normalizeMediaList($value));
                    continue;
                }

                $mediaUrls = array_merge($mediaUrls, $this->normalizeMediaList($value));
            }

            $mediaUrls = array_values(array_unique(array_filter($mediaUrls, fn($item) => $item !== null && $item !== '')));
            return $mediaUrls;
        }

        private function fetchPortfolioMedia(int $portfolioId): array{
            $rows = $this->db->query('SELECT media_url FROM portfolio_media WHERE portfolio_id = :portfolio_id AND is_active = 1 ORDER BY display_order ASC, id ASC')
                ->bind(['portfolio_id' => $portfolioId])
                ->findAll();

            $media = [];
            foreach ($rows as $row) {
                $url = trim((string)($row['media_url'] ?? ''));
                if ($url === '') {
                    continue;
                }
                $media[] = $this->toPublicPath($url);
            }

            return array_values(array_unique(array_filter($media, fn($item) => $item !== null && $item !== '')));
        }

        private function syncPortfolioMedia(int $portfolioId, array $mediaUrls): void{
            $this->db->query('DELETE FROM portfolio_media WHERE portfolio_id = :portfolio_id')->bind(['portfolio_id' => $portfolioId]);

            foreach ($mediaUrls as $index => $mediaUrl) {
                $publicUrl = $this->toPublicPath((string)$mediaUrl);
                if ($publicUrl === null || $publicUrl === '') {
                    continue;
                }

                $this->db->insert('portfolio_media', [
                    'portfolio_id' => $portfolioId,
                    'media_url' => $publicUrl,
                    'display_order' => $index,
                    'is_active' => 1,
                ]);
            }
        }

        private function formatPortfolioItem(array $item): array{
            if (!empty($item['cover_image_url'])) {
                $item['cover_image_url'] = $this->toPublicPath((string)$item['cover_image_url']);
            }

            $item['media_url'] = [];
            if (!empty($item['id'])) {
                $item['media_url'] = $this->fetchPortfolioMedia((int)$item['id']);
            }

            if (empty($item['media_url']) && !empty($item['cover_image_url'])) {
                $item['media_url'] = [$item['cover_image_url']];
            }

            return $item;
        }

        function viewPortfolio(){
                $this->ensureDb();
                $fetch_all = $this->db->execute('SELECT * FROM portfolio ORDER BY display_order ASC, id ASC');
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

            $pdo = DB::getConnection();

            try {
                $requiredFields = ['project_name', 'slug', 'client_name', 'project_summary', 'project_details', 'completion_date', 'project_url'];
                foreach ($requiredFields as $field) {
                    if (!array_key_exists($field, $data) || trim((string) $data[$field]) === '') {
                        $this->sendJson(['status' => false, 'message' => 'Missing required field: ' . $field]);
                        return;
                    }
                }

                $portfolioData = $this->extractPortfolioRow($data);
                $mediaUrls = [];
                try {
                    $mediaUrls = $this->resolvePortfolioMediaUrls($data);
                } catch (\Throwable $e) {
                    $this->sendJson(['status' => false, 'message' => $e->getMessage()]);
                    return;
                }

                if (!empty($mediaUrls)) {
                    $portfolioData['cover_image_url'] = $mediaUrls[0];
                }

                $pdo->beginTransaction();
                $inserted = $this->db->insert('portfolio', $portfolioData);
                if (!$inserted) {
                    $pdo->rollBack();
                    $this->sendJson(['status' => false, 'message' => 'Failed to add portfolio']);
                    return;
                }

                $portfolioId = (int) $this->db->lastID();
                if (!empty($mediaUrls)) {
                    $this->syncPortfolioMedia($portfolioId, $mediaUrls);
                }

                $pdo->commit();
                $this->sendJson(['status' => true, 'message' => 'portfolio details added successfully']);
            } catch (\Throwable $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
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
                 $pdo = DB::getConnection();

                 try{
                        $portfolioId = (int)($where['id'] ?? 0);
                        $portfolioData = $this->extractPortfolioRow($data);
                        $mediaUrls = [];
                        $hasMediaInput = array_key_exists('media_url', $data)
                            || array_key_exists('cover_image_url', $data)
                            || array_key_exists('portfolio_files', $data)
                            || array_key_exists('gallery_files', $data)
                            || array_key_exists('media_files', $data)
                            || array_key_exists('files', $data)
                            || array_key_exists('project_files', $data)
                            || array_key_exists('file_url', $data)
                            || isset($_FILES['media_url'])
                            || isset($_FILES['cover_image_url'])
                            || isset($_FILES['portfolio_files'])
                            || isset($_FILES['gallery_files'])
                            || isset($_FILES['media_files'])
                            || isset($_FILES['files'])
                            || isset($_FILES['project_files'])
                            || isset($_FILES['file_url']);

                        if ($hasMediaInput) {
                            $mediaUrls = $this->resolvePortfolioMediaUrls($data);
                        }

                        $pdo->beginTransaction();
                        if (!empty($portfolioData)) {
                            $update = $this->db->update('portfolio', $portfolioData, $id, $where);
                            if (!$update) {
                                $pdo->rollBack();
                                echo json_encode(['status' => false, 'message' => 'Failed to update portfolio']);
                                return;
                            }
                        }

                        if ($hasMediaInput) {
                            $this->syncPortfolioMedia($portfolioId, $mediaUrls);
                        }

                        $pdo->commit();
                        echo json_encode(['status'=>true,'message'=>"portfolio details edited successfully"]);
                 }catch(\Throwable $e){
                                     if ($pdo->inTransaction()) {
                                        $pdo->rollBack();
                                     }
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