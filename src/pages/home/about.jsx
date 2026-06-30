
function DefaultAbout(){

         return (


                 <section className="about-section">
                      <div className="container">
                           <div className="about-us-content">
                                 <h2>Who are we</h2>
                                 <p>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Voluptatum ex praesentium temporibus consequuntur magnam. Explicabo ut reiciendis quibusdam! Illo voluptatem iure quibusdam temporibus! Delectus rem aperiam nemo deserunt totam qui.</p>

                                 <h2>What we help you achieve</h2>
                                 <ul>
                                     <li>Lorem ipsum dolor sit amet consectetur adipisicing elit.</li>
                                 <li>Lorem ipsum, dolor sit amet consectetur adipisicing elit. </li>
                                </ul>
                            </div>
                            <div className="about-caption-imge-box">
                                <h2>About us</h2>
                            </div>
                      </div>
                 </section>

         )
}

function ActiveAbout(){

}



function About(){
   return (
       <>
           <DefaultAbout />
           {/* <ActiveAbout /> */}
       </>
   )
}

export default About;
