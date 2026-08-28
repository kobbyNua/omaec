import './banner.css';


function Banner(props){
 
    

       return (

           <>
           
                  <div className="banner">
                      <div className="banner-container">
                           {/*   <h2>Media Services</h2>
                           <h5>Explore our media services to enhance your brand presence.</h5>*/}
                           {props.children}

                       </div>
                 </div>
             
           </>
       )


}

export default Banner;