import Banner from "../banner/banner";
import './about.css';
function ActiveAbout(){

}

function DefaultBanner(){
       return(

           <>
               <Banner>

                       
            <h2>About Us</h2>
            <h5>Learn more about our journey, values, and the team behind our success.</h5>

               </Banner>



                   <div className="about-page-content">
        <div className="container">
            <div className="about-story">
                <h3>Our Story</h3>
                <p>Founded in 2010, we started with a simple mission: to provide exceptional digital solutions that empower businesses to grow. Over the years, we have evolved into a full-service agency, helping clients across the globe achieve their goals through innovation and creativity.</p>
            </div>
            
            <div className="about-mission">
                <h3>Our Mission</h3>
                <p>Our mission is to deliver high-quality services that exceed expectations. We believe in the power of collaboration, integrity, and continuous improvement. We strive to build lasting relationships with our clients by understanding their unique needs and delivering tailored solutions.</p>
            </div>

            <div className="our-team">
                <h3>Meet Our Team</h3>
                <div className="team-grid">
                    <div class="team-member">
                        <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80" alt="Team Member 1" />
                        <h4>John Doe</h4>
                        <p>CEO & Founder</p>
                    </div>
                    <div class="team-member">
                        <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80" alt="Team Member 2" />
                        <h4>Jane Smith</h4>
                        <p>Creative Director</p>
                    </div>
                    <div class="team-member">
                        <img src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80" alt="Team Member 3" />
                        <h4>Mike Johnson</h4>
                        <p>Lead Developer</p>
                    </div>
                    <div class="team-member">
                        <img src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80" alt="Team Member 4" />
                        <h4>Sarah Williams</h4>
                        <p>Marketing Manager</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
           </>
       )
}
function About(){

       return (
            <>
                 <DefaultBanner />
            </>
       )
}


export default About;