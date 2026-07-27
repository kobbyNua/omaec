import Carousels from "./carousel";
import "./home.css";
//import "./main.css";
import Service from "./service";
import About from "./about";
import Achievement from "./achievement";
import Clients from "./clients";
function Home(){
      return (<>
          <Carousels />
          <Service />
          <About />
          <Achievement />
          <Clients />
      </>);

}

export default Home;