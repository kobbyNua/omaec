import Banner from '../banner/banner';
import './services.css';

function DefaultServicePage(){

        return (

               <>
                      <Banner >
                           <h2>Our Services</h2>
                           <h5>We offer a wide range of services to help you succeed.</h5>

                      </Banner>
             {/** Service Content */}
  {/*<div class="service-content-banner">
         <div class="container">
            <h2>Our Services</h2>
            <h5>We offer a wide range of services to help you succeed.</h5>

         </div>
    </div>*/}

    <div className="service-contents">
           <div className="container">
                 <div className="advertisement-service">

                        <div className="advertisement-service-image"></div>
                        <div className="advertisement-service-content">
                              <h3>Advertisement Service</h3>
                              <span>Lorem ipsum dolor sit amet consectetur adipisicing elit. Dolorem, nulla magnam repellat aspernatur eaque ipsam laudantium voluptatum quos sed. Dolorem saepe dicta iure odio delectus vel provident, possimus obcaecati excepturi?</span>
                        </div>
                 </div>

                 <div className="media-service">

                        <div className="media-service-content">
                              <h3>Media Service</h3>
                              <span>Lorem ipsum dolor sit amet consectetur adipisicing elit. Porro, vero distinctio quis ratione quod corrupti ad. Nobis, perspiciatis. Sint totam laudantium rem maiores fuga aut ab ratione commodi eveniet laborum?</span>
                        </div>
                        <div className="media-service-image"></div>

                 </div>
                 <div className="events-service">
                        <div className="events-service-image"></div>
                        <div className="events-service-content">
                              <h3>Events Service</h3>
                              <span>Lorem ipsum dolor sit amet consectetur adipisicing elit. Porro, vero distinctio quis ratione quod corrupti ad. Nobis, perspiciatis. Sint totam laudantium rem maiores fuga aut ab ratione commodi eveniet laborum?</span>
                        </div>
                 </div>
                 <div className="company-branding-service">

                        <div className="company-branding-service-content">
                              <h3>Company Branding</h3>
                              <span>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Aliquam unde non maiores doloremque beatae. Dolorem qui eligendi quas nesciunt ipsa saepe eaque aliquid numquam dicta? Error asperiores accusantium repellat beatae!</span>
                        </div>
                        <div className="company-branding-service-image"></div>

                 </div>

           </div>
    </div>
               </>
        );



}
function ActiveServicePage(){

}

function Services(){
    
      return (
            <>
                <DefaultServicePage />
            </>
      )
}


export default Services;