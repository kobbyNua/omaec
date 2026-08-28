import './contact.css';
import Banner from "../banner/banner";
function ContactPage(){
    return (
        <>
            <Banner >
                    
            <h2>Contact Us</h2>
            <h5>Get in touch with us for any inquiries or collaborations.</h5>
         
            </Banner>
        </>
    );
}
function Contact(){
    return (
          <>
                <ContactPage />



    <div className="contact-page-content">
        <div className="container">
            <div className="contact-wrapper">
                <div className="contact-info">
                    <h3>Contact Information</h3>
                    <p>Feel free to reach out to us through any of the following channels. We are here to help you with your needs.</p>
                    <div className="info-item">
                        <i className="fas fa-map-marker-alt"></i>
                        <div>
                            <h4>Address</h4>
                            <p>123 Creative Street, Tech City, TC 10101</p>
                        </div>
                    </div>
                    <div className="info-item">
                        <i className="fas fa-phone"></i>
                        <div>
                            <h4>Phone</h4>
                            <p>+1 (123) 456-7890</p>
                        </div>
                    </div>
                    <div className="info-item">
                        <i className="fas fa-envelope"></i>
                        <div>
                            <h4>Email</h4>
                            <p>info@omronmedia.com</p>
                        </div>
                    </div>
                </div>
                <div className="contact-form">
                    <h3>Send us a Message</h3>
                    <form>
                        <div className="form-group">
                            <input type="text" placeholder="Your Name" required />
                        </div>
                        <div className="form-group">
                            <input type="email" placeholder="Your Email" required />
                        </div>
                        <div className="form-group">
                            <input type="text" placeholder="Subject" required />
                        </div>
                        <div className="form-group">
                            <textarea placeholder="Your Message" rows="5" required></textarea>
                        </div>
                        <button type="submit" className="btn-submit">Send Message</button>
                    </form>
                </div>
            </div>
        </div>
    </div>
          </>
    )
}


export default Contact;