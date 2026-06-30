import Banner from '../banner/banner';
import './media.css';

function DefaultMediaPage(){
      
        return (
            <>
               <Banner>
                 <h2>Media Services</h2>
                 <h5>Explore our media services to enhance your brand presence.</h5>
               </Banner>

   <div className="media-content" >
        
              <div className="media-video-works">
                <div className="container">    
                <div className="recent-video-works">
                            <h3>Recent Video Works</h3>
                            <video controls>
                                <source src="../media/sample-video.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                     </div>
                     <div className="some-video-works">
                            <h3>Some of Our Video Works</h3>
                            <div className="video-thumbnails">
                                 <div className="video-thumbnail">
                                      <video controls>
                                          <source src="../media/sample-video2.mp4" type="video/mp4" />
                                          Your browser does not support the video tag.
                                      </video>
                                 </div>
                                 <div className="video-thumbnail">
                                      <video controls>
                                          <source src="../media/sample-video3.mp4" type="video/mp4" />
                                          Your browser does not support the video tag.
      
                                        </video>
                                 </div>
                                 <div className="video-thumbnail">
                                      <video controls>
                                          <source src="../media/sample-video4.mp4" type="video/mp4" />
                                          Your browser does not support the video tag.
                                      </video>
                                 </div>
                            </div>
                     </div>
                </div>
              </div>
              <div className="our-photo-works">
                     <h3>Our Photo Works</h3>
                        <div className="photo-gallery">
                            <div className="photo-item">
                        <img src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Camera" />
                            </div>
                            <div className="photo-item">
                        <img src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Nature" />
                            </div>
                            <div className="photo-item">
                        <img src="https://images.unsplash.com/photo-1551316679-9c6ae9dec224?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Portrait" />
                            </div>
                            <div className="photo-item">
                        <img src="https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Urban" />
                            </div>
                           <div className="photo-item">
                        <img src="https://images.unsplash.com/photo-1523206489230-c012c64b2b48?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Tech" />
                            </div>
                            <div className="photo-item">
                        <img src="https://images.unsplash.com/photo-1472214103451-9374bd1c798e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Nature" />
                            </div>
                            <div className="photo-item">
                        <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Portrait" />
                            </div>
                            <div className="photo-item">
                        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Fashion" />
                            </div>
                            <div className="photo-item">
                        <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Landscape" />
                            </div>
                            <div className="photo-item">
                        <img src="https://images.unsplash.com/photo-1501504905252-473c47e087f8?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Coffee" />
                            </div>
            </div>
            <div className="container">
              <div className="media-description">
                   <h3>Our Media Services</h3>
                   <p>We provide a variety of media services including content creation, social media management, and digital marketing strategies to help your business grow.</p>
              </div>
              <div className="media-features">
                   <div className="feature-item">
                        <i className="fas fa-video"></i>
                        <h4>Video Production</h4>
                        <p>High-quality video content to engage your audience.</p>
                   </div>
                   <div className="feature-item">
                        <i className="fas fa-photo-video"></i>
                        <h4>Photography</h4>
                        <p>Professional photography services for all your needs.</p>
                   </div>
                   <div className="feature-item">
                        <i className="fas fa-bullhorn"></i>
                        <h4>Social Media Management</h4>
                        <p>Effective strategies to boost your social media presence.</p>
                   </div>
                   <div className="feature-item">
                        <i className="fas fa-globe"></i>
                        <h4>Digital Marketing</h4>
                        <p>Comprehensive digital marketing solutions to grow your brand.</p>
                   </div>
              </div>
         </div>
    </div>
    </div>

            </>
        )
}
function ActiveMediaPage(){}

function Media(){
    return (
        <>
            <DefaultMediaPage />
            <ActiveMediaPage />
        </>
    )
}


export default Media