import "./events.css";
import Banner from "../banner/banner";


function Events(){

       return (

           <>
                
                <Banner>
                      <h2>Events</h2>
                      <h5>Stay updated with our latest events and happenings.</h5>
                </Banner>



    {/** Events content goes here */}
     <div className="events-content">
           <div className="container">

                 <div className="events">
                       <div className="live-events-streaming">

                            <h3>Live Events & Streaming</h3>
                            <video controls>
                                <source src="../media/sample-event-video.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                       </div>
                       <div class="upcoming-events-list">
                            <h3>Upcoming Events</h3>
                            <div class="event-item">
                                <a href="upcoming-events.html">
                                      <img src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Event 1" />    
                                      <div className="event-brief-info">
                                          <h4>Event Title 1</h4>
                                          <p>Date: July 15, 2024</p>
                                         <p>Location: New York City</p>
                                       </div>
                                </a>                            
                            </div>
                            <div className="event-item">
                                <a href="upcoming-events.html">
                                    <img src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Event 2" />
                                    <div className="event-brief-info">
                                        <h4>Event Title 2</h4>
                                        <p>Date: August 20, 2024</p>
                                        <p>Location: Los Angeles</p>
                                    </div>
                                </a>
                            </div>
                       </div>
                 </div>


           </div>

     </div>
    <div class="recents-events">
          
                <div class="container">
                        <div className="recent-events-content">
                             <h3>Recent Events Coverage</h3>
                             <p>Check out our recent events coverage showcasing our expertise in event media services.</p>
                             <div className="recent-events-gallery">
                                <div className="event-photo-item">
                                     <img src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Event Photo 1" />
                                     <div class="event-overlay">
                                         <a href="event-story.html">click to view more</a>
                                     </div>
                                </div>
                                <div className="event-photo-item">
                                     <img src="https://images.unsplash.com/photo-1494526585095-c41746248156?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Event Photo 2" />
                                     <div class="event-overlay">
                                            <a href="event-story.html">click to view more</a>
                                     </div>
                                </div>
                                <div className="event-photo-item">
                                     <img src="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Event Photo 3" />
                                     <div class="event-overlay">
                                            <a href="event-story.html">click to view more</a>
                                     </div>
                                </div>
                                <div className="event-photo-item">
                                     <img src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Event Photo 4" />
                                        <div class="event-overlay">
                                                <a href="event-story.html">click to view more</a>
                                        </div>
                                </div>
                                <div className="event-photo-item">
                                     <img src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Event Photo 5" />
                                        <div class="event-overlay">
                                                <a href="event-story.html">click to view more</a>
                                        </div>
                                </div>
                                <div className="event-photo-item">
                                    <img src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Event Photo 6" />
                                    <div class="event-overlay">
                                        <a href="event-story.html">click to view more</a>
                                    </div>
                                </div>
                                <div className="event-photo-item">
                                    <img src="https://images.unsplash.com/photo-1527529482837-4698179dc6ce?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Event Photo 7" />
                                    <div class="event-overlay">
                                        <a href="event-story.html">click to view more</a>
                                    </div>
                                </div>
                             </div>
                        </div>
                </div>
    </div>
           </>
       )
}


export default Events;