/*import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'*/
import Home from './pages/home/home';
import About from './pages/about/about';
import Events  from './pages/events/events';
import Media from './pages/media/media';
import Services  from './pages/services/services'; 
import Portfolio from './pages/portfolio/portfolio.jsx';
import Contact from './pages/contact/contact.jsx';
import Blog from './pages/blog/blog.jsx';
import './App.css';
import { useState ,useEffect } from 'react';
import './styles.css';
import { BrowserRouter as BrowseRouter, Routes, Route, Link } from 'react-router-dom';


function App() {
//const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };


    useEffect(() => {
    const handleScroll = () => {
      // If user scrolls past 100px (or your banner height), change state
      if (window.scrollY > 100) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  
 



  return <>

  
  <BrowseRouter>
        <nav className="navbar">
             <div className="container">
                  <div className="navbar-logo">
                           <a href="/">My Website</a>
                  </div>

                  {/* Hamburger Menu Icon for Mobile */}
                  <div className={`navbar-toggle ${isOpen ? 'open' : ''}`} onClick={toggleMenu}>
                       <span className="bar"></span>
                       <span className="bar"></span>
                       <span className="bar"></span>
                  </div>

                   <ul className={`navbar-links ${isOpen ? 'active' : ''}`}>
                       <li><Link to="/">Home</Link></li>
                       <li><Link to="/about">About</Link></li>
                        <li><Link to="/services">Services</Link></li>
                        <li><Link to="/media">Media</Link></li>
                        <li><Link to="/events">Events</Link></li>
                        <li><Link to="/portfolio">Portfolio</Link></li>
                        <li><Link to="/blog">Blog</Link></li>
                        <li><Link to="/contact">Contact</Link></li>
                    </ul>
        </div>
    </nav>        



        <Routes>
               <Route path="/" element={<Home />}/>
               <Route path="/about" element={<About />}/>
               <Route path="/services" element={<Services />}/>
               <Route path="/media" element={<Media />}/>
               <Route path="/events" element={<Events />}/>
               <Route path="/portfolio" element={<Portfolio />}/>
               <Route path="/blog" element={<Blog />}/>
               <Route path="/contact" element={<Contact />}/>
        </Routes>
  </BrowseRouter>
  {/* footer */}

    <div className="footer">
        <div className="container">
            <div className="footer-content">

                           <ul>
                              <li><a href="#"><i className="fab fa-facebook-f"></i></a></li>
                              <li><a href="#"><i className="fab fa-twitter"></i></a></li>
                              <li><a href="#"><i className="fab fa-instagram"></i></a></li>
                              <li><a href="#"><i className="fab fa-linkedin-in"></i></a></li>
                           </ul>

                           <ul>
                              <li><a href="#">Home</a></li>
                              <li><a href="#">About</a></li>
                              <li><a href="#">Services</a></li>
                              <li><a href="#">Contact</a></li>
                           </ul>
            </div>
            <p>&copy; 2024 My Website. All rights reserved.</p>
        </div>
    </div>

  </>
  /*const [count, setCount] = useState(0)

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )*/
}

export default App
