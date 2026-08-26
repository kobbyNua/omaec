<?php
    require __DIR__.'/../query.php';
    require_once __DIR__.'/../uploads.php';
   /**
    * users can view data at page
    * admin,can view and update the various section of the home page
    * the home page is made up of the following section 

    */

   /*
     CREATE TABLE home_banners(
      id INT(3) NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tagline VARCHAR(100) DEFAULT NULL,
      title VARCHAR(255) NOT NULL, 
      subTitle TEXT DEFAULT NULL, 
      image_url VARCHAR(255) NOT NULL,
      media_type  ENUM('video','image') DEFAULT 'image',
      banner_url VARCHAR(255) DEFAULT NULL, 
      display_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1, starT_at DATETIME DEFAULT NULL, end_at DATETIME DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UPDATE_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_active_order(is_active,display_order) );

  //ALTER TABLE home_banners ADD COLUMN media_type ENUM('video','image') DEFAULT 'image' AFTER image_url;

     CREATE TABLE home_services_header( 
        id INT(3) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(150) NOT NULL,
        subtitle VARCHAR(255) DEFAULT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
     );
     CREATE TABLE Home_services( id INT(3) NOT NULL AUTO_INCREMENT PRIMARY KEY, title VARCHAR(150) NOT NULL, short_description TEXT NOT NULL, icon_type enum('font-awesome','svg','image') DEFAULT 'font-awesome', icon_value VARCHAR(255) DEFAULT 'fa-laptop', display_order INT DEFAULT 0, is_active TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, update_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX idx_serivice_active_order(is_active,display_order) );
    
     CREATE TABLE about_identity(
         id INT(3) NOT NULL AUTO_INCREMENT PRIMARY KEY,
         title VARCHAR(255) DEFAULT NULL,
         body VARCHAR(255) NOT NULL,
         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
     );

     CREATE TABLE home_achievement(
         id INT(3) NOT NULL AUTO_INCREMENT PRIMARY KEY,
         figures INT DEFAULT 0,         icon_value ENUM('font-awesome','svg','image') DEFAULT 'font-awesome',
         icon_type VARCHAR(255) DEFAULT 'fa-laptop',
         archivement_name VARCHAR(255) NOT NULL,
         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
     );

     CREATE TABLE home_CLIENTS(
         id INT(3) NOT NULL AUTO_INCREMENT PRIMARY KEY,
         photo_url VARCHAR(255) NOT NULL,
         alt VARCHAR(200) NOT NULL,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
     );
    */
   class Home{
         private $db;
         public function __construct(){
            $this->db = new Queries();
         }

         private function setNoCacheHeaders(): void{
            header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
            header('Pragma: no-cache');
            header('Expires: 0');
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

         private function toCacheBustUrl(?string $path, ?string $timestamp = null): ?string{
            $publicPath = $this->toPublicPath($path);

            if (empty($publicPath)) {
                return null;
            }

            if (preg_match('#^https?://#i', $publicPath)) {
                return $publicPath;
            }

            $version = $timestamp ? preg_replace('/[^0-9]/', '', (string) $timestamp) : time();
            $separator = strpos($publicPath, '?') === false ? '?' : '&';

            return $publicPath . $separator . 'v=' . $version;
         }

         private function formatBannerForResponse(array $banner): array{
            $timestamp = $banner['updated_at'] ?? $banner['UPDATE_AT'] ?? $banner['created_at'] ?? null;

            if (!empty($banner['image_url'])) {
                $banner['image_url'] = $this->toCacheBustUrl($banner['image_url'], (string) $timestamp);
            }

            return $banner;
         }

         private function sendJson(array $payload): void{
            $this->setNoCacheHeaders();
            echo json_encode($payload);
         }

         private function resolveBannerUploadFile(array $data): ?array{
            $fileKeys = ['image_url', 'video_url', 'media', 'file', 'banner'];

            foreach ($fileKeys as $key) {
                if (!empty($_FILES[$key]['name'])) {
                    return $_FILES[$key];
                }
            }

            foreach ($fileKeys as $key) {
                if (!empty($data[$key]) && is_array($data[$key])) {
                    return $data[$key];
                }
            }

            return null;
         }

         public function addBanner(array $data){
            if(!is_array($data)){
                    throw new InvalidArgumentException("Data must be an array");
              }

              try{
                    $bannerFile = $this->resolveBannerUploadFile($data);

                    if ($bannerFile !== null) {
                        $mimeType = $bannerFile['type'] ?? '';
                        $type = (stripos($mimeType, 'video/') === 0) ? 'video' : null;

                        if (empty($type) && !empty($bannerFile['name'])) {
                            $ext = strtolower(pathinfo($bannerFile['name'], PATHINFO_EXTENSION));
                            $type = in_array($ext, ['mp4', 'mov', 'avi', 'mkv', 'webm'], true) ? 'video' : null;
                        }

                        $uploadResult = uploadMediaFile($bannerFile, null, $type);

                        if (!$uploadResult['success']) {
                            $this->sendJson(['status'=>false,'message'=>$uploadResult['message']]);
                            return;
                        }

                        $data['image_url'] = $this->toPublicPath($uploadResult['path']);
                    }

                    $add_banner=$this->db->insert('home_banners',$data);

                    if ($add_banner) {
                        $this->sendJson(['status'=>true,'message'=>'Banner added successfully']);
                    } else {
                        $this->sendJson(['status'=>false,'message'=>'Failed to add banner']);
                    }
              }
              catch(Exception $e){
                    $this->sendJson(['status'=>false,'message'=>'invalid data']);
                    error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
              }
         }
         public function viewBanner(){

                  $fetch_all = $this->db->execute('SELECT * FROM home_banners ORDER BY display_order ASC, id ASC');
                  $banners = $fetch_all->fetchAll(PDO::FETCH_ASSOC);
                  $formattedBanners = array_map([$this, 'formatBannerForResponse'], $banners);
                  $this->sendJson(['status'=>true,'data'=>$formattedBanners]);
               
         }

         public function editBanner(array $data,string $id,array $where){
                 if(!is_array($data)){
                      throw new InvalidArgumentException('invalid data');
                 }

                 try{
                        $bannerFile = $this->resolveBannerUploadFile($data);

                        if ($bannerFile !== null) {
                            $mimeType = $bannerFile['type'] ?? '';
                            $type = (stripos($mimeType, 'video/') === 0) ? 'video' : null;

                            if (empty($type) && !empty($bannerFile['name'])) {
                                $ext = strtolower(pathinfo($bannerFile['name'], PATHINFO_EXTENSION));
                                $type = in_array($ext, ['mp4', 'mov', 'avi', 'mkv', 'webm'], true) ? 'video' : null;
                            }

                            $uploadResult = uploadMediaFile($bannerFile, null, $type);

                            if (!$uploadResult['success']) {
                                $this->sendJson(['status'=>false,'message'=>$uploadResult['message']]);
                                return;
                            }

                            $data['image_url'] = $this->toPublicPath($uploadResult['path']);
                        }

                        $update= $this->db->update('home_banners',$data,$id,$where);
                        $results = ($update) ? ['status'=>true,'message'=>"Banner edited successfully"] : ['status'=>false,'message'=>"Failed to add banner"];
                        $this->sendJson($results);
                 }catch(Exception $e){
                                     $this->sendJson(['status'=>false,'message'=>"invalid data"]);
                     error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
                 }
         }
         

         public function getBannerDetails(array $data){
                 if(!is_array($data)){
                     throw new Exception('invalid data');
                 }
                 try{
                      $get_details = $this->db->query('SELECT * FROM home_banners WHERE id=:id')->bind($data)->findAll();
                      $formattedBanners = array_map([$this, 'formatBannerForResponse'], $get_details);
                      $this->sendJson(['status'=>true,'data'=>$formattedBanners]);
                 }
                 catch(Exception $e){
                      $this->sendJson(['status'=>false,'message'=>"invalid data"]);
                      error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));          
                 }
                 
         }

         public function addService(array $data){
            

            if(!is_array($data)){
                    throw new InvalidArgumentException("Data must be an array");
              }
              try{
                    
                               
                    $add_banner=$this->db->insert('Home_services',$data);

                    $results=($add_banner) ? ['status'=>true,'message'=>"services added successfully"] : ['status'=>false,'message'=>"Failed to add banner"];
                     echo json_encode($results);
                     //echo PHP_EOL;
                    /**/
              }
              catch(Exception $e){
                    echo json_encode(['status'=>false,'message'=>'invalid data']);
                    error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
                    //echo PHP_EOL;
              }

              foreach($data as $key=>$value){
                    if(!is_array($value)){
                         throw new InvalidArgumentException("Invalid key: " . $key);
                    }
                    // Additional validation for values can be added here
               }
               try{
                    $inserted = $this->db->insert('Home_services',$data);
                    $results=($inserted) ? ['status'=>true,'message'=>"Banner added successfully"] : ['status'=>false,'message'=>"Failed to add banner"];
                     echo json_encode($results);
               }catch(\Throwable $e){
                     echo json_encode(['status'=>false,'message'=>"invalid data"]);
                     error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
               }


         }
         public function viewService(){
                  $fetch_all = $this->db->execute('SELECT * FROM Home_services');
                  echo json_encode(['status'=>true,'data'=>$fetch_all->fetchAll()]);
         }
         public function editService(array $data, string $whereClause, array $whereParams = []){

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
         }

         public function getServiceDetail(array $data){


                 if(!is_array($data)){
                     throw new Exception('invalid data');
                 }
                 try{
                      $get_details = $this->db->query('SELECT * FROM Home_services WHERE id=:id')->bind($data)->findAll();
                      echo json_encode(['status'=>true,'data'=>$get_details]);
                 }
                 catch(Exception $e){
                      echo json_encode(['status'=>false,'message'=>"invalid data"]);
                      error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
                 }


         }
         public function addAbout(array $data){

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
                $inserted = $this->db->insert('home_about_identity',$data);
                $results=($inserted) ? ['status'=>true,'message'=>"about added successfully"] : ['status'=>false,'message'=>"Failed to add banner"];
                echo json_encode($results);
            }catch(\Throwable $e){
                echo json_encode(['status'=>false,'message'=>"invalid data"]);
                error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
            }
         }
         public function  viewAbout(){

                $fetch_all = $this->db->execute('SELECT * FROM home_about_identity');
                echo json_encode(['status'=>true,'data'=>$fetch_all->fetchAll()]);
         }
         public function editAbout(array $data,string $id,array $where){

                 if(!is_array($data)){
                      throw new InvalidArgumentException('invalid data');
                 }

                 try{
                        $update= $this->db->update('home_about_identity',$data,$id,$where);
                        $results = ($update) ? ['status'=>true,'message'=>"about edited successfully"] : ['status'=>false,'message'=>"Failed to add banner"];
                        echo json_encode($results);
                 }catch(Exception $e){
                                     echo json_encode(['status'=>false,'message'=>"invalid data"]);
                     error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
                 }
         }

         public function getAboutDetails(array $data){


                 if(!is_array($data)){
                     throw new Exception('invalid data');
                 }
                 try{
                      $get_details = $this->db->query('SELECT * FROM home_about_identity WHERE id=:id')->bind($data)->findAll();
                      echo json_encode(['status'=>true,'data'=>$get_details]);
                 }
                 catch(Exception $e){
                      echo json_encode(['status'=>false,'message'=>"invalid data"]);
                      error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
                 }

         }

         public function addClient(array $data)
         {   
             if (!is_array($data)) {
                 throw new InvalidArgumentException("Data must be an array");
             }

             try {
                 if (!empty($_FILES['photo_url']['name'])) {
                     $uploadResult = uploadMediaFile($_FILES['photo_url']);

                     if (!$uploadResult['success']) {
                         $this->sendJson(['status' => false, 'message' => $uploadResult['message']]);
                         return;
                     }

                     $data['photo_url'] = $this->toPublicPath($uploadResult['path']);
                 } elseif (!empty($data['photo_url']) && is_array($data['photo_url'])) {
                     $uploadResult = uploadMediaFile($data['photo_url']);

                     if (!$uploadResult['success']) {
                         $this->sendJson(['status' => false, 'message' => $uploadResult['message']]);
                         return;
                     }

                     $data['photo_url'] = $this->toPublicPath($uploadResult['path']);
                 }

                 $inserted = $this->db->insert('home_CLIENTS', $data);

                 if ($inserted) {
                     $this->sendJson(['status' => true, 'message' => 'Client added successfully']);
                 } else {
                     $this->sendJson(['status' => false, 'message' => 'Failed to add client']);
                 }
             } catch (Exception $e) {
                 $this->sendJson(['status' => false, 'message' => 'invalid data']);
                 error_log(json_encode(['status' => false, 'message' => $e->getMessage()]));
             }
         }
         public function viewClient(){
                $fetch_all = $this->db->execute('SELECT * FROM home_CLIENTS');
                echo json_encode(['status'=>true,'data'=>$fetch_all->fetchAll()]);
         }

         public function editClient(array $data,string $id,array $where){

                 if(!is_array($data)){
                      throw new InvalidArgumentException('invalid data');
                 }

                 try{
                        $update= $this->db->update('home_CLIENTS',$data,$id,$where);
                        $results = ($update) ? ['status'=>true,'message'=>"client detail edited successfully"] : ['status'=>false,'message'=>"Failed to add banner"];
                        echo json_encode($results);
                 }catch(Exception $e){
                                     echo json_encode(['status'=>false,'message'=>"invalid data"]);
                     error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
                 }
         }

         public function getClientDetals(array $data){

                
                 if(!is_array($data)){
                     throw new Exception('invalid data');
                 }
                 try{
                      $get_details = $this->db->query('SELECT * FROM home_CLIENTS WHERE id=:id')->bind($data)->findAll();
                      echo json_encode(['status'=>true,'data'=>$get_details]);
                 }
                 catch(Exception $e){
                      echo json_encode(['status'=>false,'message'=>"invalid data"]);
                      error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
                 }

         }

            /**
             * 
             * company achievement
             */


         public function addAchievements($data = []){

            $data = is_array($data) ? $data : [];

              if (!isset($data['figures']) || !is_numeric($data['figures'])) {
                    echo json_encode(['status'=>false,'message'=>'Invalid figures value']);
                    return;
              }

              if (!isset($data['archivement_name']) || trim((string) $data['archivement_name']) === '') {
                    echo json_encode(['status'=>false,'message'=>'Achievement name is required']);
                    return;
              }

              $data['figures'] = (int) $data['figures'];
              if (isset($data['icon_value']) && is_string($data['icon_value']) && trim($data['icon_value']) !== '') {
                    $data['icon_value'] = trim($data['icon_value']);
              }

              try{
                    $inserted = $this->db->insert('home_achievement',$data);
                    $results=($inserted) ? ['status'=>true,'message'=>"achievement detail added successfully"] : ['status'=>false,'message'=>"Failed to add banner"];
                     echo json_encode($results);
              }
              catch(\Throwable $e){
                    echo json_encode(['status'=>false,'message'=>'invalid data']);
                    error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
              }

         }
         public function viewAchievement(){
                $fetch_all = $this->db->execute('SELECT * FROM home_achievement');
                echo json_encode(['status'=>true,'data'=>$fetch_all->fetchAll()]);
         }

         public function editAchievement($data = [], string $id = 'id = :id', array $where = []){

                 $data = is_array($data) ? $data : [];

                 /*if (empty($data)) {
                     echo json_encode(['status'=>false,'message'=>'No update data provided']);
                     return;
                 }

                 if (empty($where['id']) || !is_scalar($where['id']) || (string) $where['id'] === '') {
                     echo json_encode(['status'=>false,'message'=>'Achievement ID is required']);
                     return;
                 }*/

                 try{
                        $update= $this->db->update('home_achievement',$data,$id,$where);
                        $results = ($update) ? ['status'=>true,'message'=>"achievement detail edited successfully"] : ['status'=>false,'message'=>"Failed to update achievement"];
                        echo json_encode($results);
                 }catch(Exception $e){
                                     echo json_encode(['status'=>false,'message'=>"invalid data"]);
                     error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
                 }
         }

         public function getAchievementDetalis(array $data){

                
                 if(!is_array($data)){
                     throw new Exception('invalid data');
                 }
                 try{
                      $get_details = $this->db->query('SELECT * FROM home_achievement WHERE id=:id')->bind($data)->findAll();
                      echo json_encode(['status'=>true,'data'=>$get_details]);
                 }
                 catch(Exception $e){
                      echo json_encode(['status'=>false,'message'=>"invalid data"]);
                      error_log(json_encode(['status'=>false,'message'=>$e->getMessage()]));
                 }

         }

   }

   $home = new Home();
   //$data=['tagline'=>'the tagline is ','title'=>'the title is ','subTitle'=>'the subtitle is ','image_url'=>'https://example.com/image.jpg','banner_url'=>'https://example.com/banner','display_order'=>1,'is_active'=>1,'start_at'=>'2024-01-01 00:00:00','end_at'=>'2024-12-31 23:59:59'];
   //$home->addBanner($data);
   $home->viewBanner();

   //$home->editBanner(['display_order'=>0],'id=:id',['id'=>4]);
   //$home->getBannerDetails(['id'=>2]);