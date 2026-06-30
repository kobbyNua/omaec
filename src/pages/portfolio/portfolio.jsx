import Banner from '../banner/banner';
import './portfolio.css';




function DefaultPortfolio(){

      return (<>
           <Banner>
                 <h2>Portfolio</h2>
                 <h5>Discover our diverse portfolio showcasing our best works.</h5>
            
           </Banner>
    <div className="portfolio-content">
        <div className="container">
            <h2>Our Amazing Works</h2>
            <p>Explore our portfolio to see the latest projects and creative solutions we've delivered.</p>
            <div className="portfolio-gallery">
                <div className="portfolio-item">
                    <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Project 1" />
                    <div className="portfolio-overlay">
                        <h4>Landscape Photography</h4>
                        <p>Photography</p>
                    </div>
                </div>
                <div className="portfolio-item">
                    <img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Project 2" />
                    <div className="portfolio-overlay">
                        <h4>Web Development</h4>
                        <p>Branding</p>
                    </div>
                </div>
                <div className="portfolio-item">
                    <img src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Project 3" />
                    <div className="portfolio-overlay">
                        <h4>Team Collaboration</h4>
                        <p>Events</p>
                    </div>
                </div>
                <div className="portfolio-item">
                    <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Project 4" />
                    <div class="portfolio-overlay">
                        <h4>Mobile App Showcase</h4>
                        <p>Media</p>
                    </div>
                </div>
                <div className="portfolio-item">
                    <img src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Project 5" />
                    <div className="portfolio-overlay">
                        <h4>Vintage Camera</h4>
                        <p>Photography</p>
                    </div>
                </div>
                <div className="portfolio-item">
                    <img src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Project 6" />
                    <div className="portfolio-overlay">
                        <h4>Concert Videography</h4>
                        <p>Video</p>
                    </div>
                </div>
                <div className="portfolio-item">
                    <img src="https://images.unsplash.com/photo-1551316679-9c6ae9dec224?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Project 7" />
                    <div className="portfolio-overlay">
                        <h4>Fashion Shoot</h4>
                        <p>Photography</p>
                    </div>
                </div>
                <div className="portfolio-item">
                    <img src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Project 8" />
                    <div className="portfolio-overlay">
                        <h4>Corporate Event</h4>
                        <p>Events</p>
                    </div>
                </div>

            </div>
        </div>
    </div>




      </>)
}

function ActivePortfolio(){

}
function Portoflio(){
         
       return (
          <>
               <DefaultPortfolio />
          </>
       )

}

export default Portoflio