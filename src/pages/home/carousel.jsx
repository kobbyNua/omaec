import { useEffect, useState } from "react";
import { createPortal } from "react-dom";


//add carousel modal
function AddCarouselModal(){
     
    return (
          <>
             <div className="modal">
                  <div className="modal-content">
                       <div className="modal-header"></div>
                       <div className="modal-body"></div>
                       <div className="modal-footer"></div>
                  </div>
             </div>
          </>
    )

}


//edit carousel modal
function Editcarouselmodal(){

    return (

          <>
             <div className="modal">
                  <div className="modal-content">
                       <div className="modal-header"></div>
                       <div className="modal-body"></div>
                       <div className="modal-footer"></div>
                  </div>
             </div>
          </>
    )
}



function DefaultCarousel(){
     /*
       is dislay when carousel modal is empty
     */
     const [activeIndex,setActiveIndex] = useState(0);
     const totalSlides = 4; // Total number of slides in the carousel

     useEffect(() => {
         const interval = setInterval(() => {
             setActiveIndex((prevIndex) => (prevIndex + 1) % totalSlides);
         }, 5000); // Change slide every 3 seconds

         return () => clearInterval(interval);
     }, []);

     /**
      * 
              <button data-target="0" className={`carousel-item ${activeIndex === 0 ? "active" : ""}`}></button>
              <button data-target="1" className={`carousel-item ${activeIndex === 1 ? "active" : ""}`}></button>
              <button data-target="2" className={`carousel-item ${activeIndex === 2 ? "active" : ""}`}></button>
              <button data-target="3" className={`carousel-item ${activeIndex === 3 ? "active" : ""}`}></button>
      * 
      */

    return (<>
           
        <div className="carousel">

              <div className={`carousel-item ${activeIndex === 0 ? "active" : ""}`}>
                  <img src="banner1.jpg" alt="Banner 1" />
              </div>
              <div className={`carousel-item ${activeIndex === 1 ? "active" : ""}`}>
                   <img src="banner2.jpg" alt="Banner 2" />
              </div>
              <div className={`carousel-item ${activeIndex === 2 ? "active" : ""}`}>
                  <img src="banner3.jpg" alt="Banner 3" />
              </div>
              <div className={`carousel-item ${activeIndex === 3 ? "active" : ""}`}>
                  <img src="banner4.jpg" alt="Banner 4" />
             </div>

    
           <div className="carousel-indicators">
                 {[0,1,2,3].map((index) => (
                     <button 
                         key={index}
                         data-target={index}
                         className={ activeIndex === index ? "active" : ""}
                     ></button>
                 ))}
           </div>
        </div>

    </>)

}

function ActiveCarousel(){
      /**
       * display when carousel modal is not empty
       * 
       */
}
function Carousels(){
      
       const createCarousel=()=>{}

       const viewCarousel=()=>{}

       const updateCarousel=()=>{}

       return (
              <>
                 <DefaultCarousel />
              </>

       );
}

export default Carousels;