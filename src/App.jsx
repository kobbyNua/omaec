/*import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'*/
import Home from './pages/home/home';
import About from './pages/about/about';
import Events  from './pages/events/events';
import Media from './pages/media/media';
import MediaPhotoPage from './pages/media/media-photo';
import MediaVideoPage from './pages/media/media-video';
import Services  from './pages/services/services'; 
import Portfolio from './pages/portfolio/portfolio.jsx';
import Contact from './pages/contact/contact.jsx';
import Blog from './pages/blog/blog.jsx';
import LoginPage from './pages/login/login.jsx';
import AdminPage from './pages/admin/admin.jsx';
import UserPage from './pages/user/user.jsx';
import ResetPassword from './pages/admin/reset-password';
import './App.css';
import { useState ,useEffect, useRef } from 'react';
import './styles.css';
import { BrowserRouter as BrowseRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { subscribeToAuthChanges, logoutUser } from './Authentication/auth';

const pageTitleMap = {
  '/': 'Home',
  '/about': 'About',
  '/services': 'Services',
  '/media': 'Media',
  '/events': 'Events',
  '/portfolio': 'Portfolio',
  '/blog': 'Blog',
  '/contact': 'Contact',
  '/login': 'Login',
  '/reset-password': 'Reset Password',
  '/admin': 'Admin',
  '/user': 'User',
};

function AppContent() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  useEffect(() => {
    // 1. Check local storage for initial states
    const localAdmin = window.localStorage.getItem('admin-auth');
    const localUserStr = window.localStorage.getItem('user-auth');

    if (localAdmin === 'true' || localAdmin === 'google' || localAdmin === 'firebase') {
      setUser({ email: import.meta.env.VITE_ADMIN_EMAIL || 'admin' });
    } else if (localUserStr) {
      try {
        const parsed = JSON.parse(localUserStr);
        if (parsed && parsed.email) {
          setUser({ email: parsed.email });
        }
      } catch (e) {
        // ignore
      }
    }

    // 2. Subscribe to firebase auth changes
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        const stillAdmin = window.localStorage.getItem('admin-auth');
        const stillUser = window.localStorage.getItem('user-auth');
        if (!stillAdmin && !stillUser) {
          setUser(null);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const match = Object.entries(pageTitleMap).find(([path]) => {
      if (path === location.pathname) return true;
      if (path !== '/events' && path !== '/admin' && path !== '/user' && path !== '/login' && path !== '/reset-password' && path !== '/portfolio' && path !== '/blog' && path !== '/contact' && path !== '/about' && path !== '/services' && path !== '/media') {
        return false;
      }
      return false;
    });

    const pageName = pageTitleMap[location.pathname] ||
      (location.pathname.startsWith('/events') ? 'Events' :
      location.pathname.startsWith('/portfolio') ? 'Portfolio' :
      location.pathname.startsWith('/blog') ? 'Blog' :
      location.pathname.startsWith('/contact') ? 'Contact' :
      'Home');

    document.title = `Omron Media | ${pageName}`;
  }, [location.pathname]);

  const handleLogout = async () => {
    window.localStorage.removeItem('admin-auth');
    window.localStorage.removeItem('user-auth');
    await logoutUser();
    setUser(null);
    setIsDropdownOpen(false);
    window.location.href = '/login';
  };

  
 



  return <>
        <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
             <div className="container">
                  <div className="navbar-logo">
                           <a href="/"><img src={isScrolled ? '/black_logo.png' : '/while_logo.png'} alt="My Website" /></a>
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
                        {user ? (
                          <li ref={dropdownRef} style={{ position: 'relative' }}>
                            <button
                              type="button"
                              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                              className="navbar-user-btn"
                            >
                              <span>{user.email ? user.email.split('@')[0] : 'User'}</span>
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{
                                  transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s ease',
                                }}
                              >
                                <polyline points="6 9 12 15 18 9"></polyline>
                              </svg>
                            </button>

                            {isDropdownOpen && (
                              <div
                                className="navbar-dropdown-menu"
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  right: 0,
                                  marginTop: '10px',
                                  backgroundColor: '#ffffff',
                                  minWidth: '160px',
                                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                  borderRadius: '8px',
                                  padding: '4px 0',
                                  zIndex: 1000,
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={handleLogout}
                                  style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '0.6rem 1rem',
                                    background: 'none',
                                    border: 'none',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    fontSize: '0.95rem',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    transition: 'background-color 0.2s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#fef2f2';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <polyline points="16 17 21 12 16 7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                  </svg>
                                  <span>Logout</span>
                                </button>
                              </div>
                            )}
                          </li>
                        ) : (
                          <li><Link to="/login">Login</Link></li>
                        )}
                    </ul>
        </div>
    </nav>        



        <Routes>
               <Route path="/" element={<Home />}/>
               <Route path="/about" element={<About />}/>
               <Route path="/services" element={<Services />}/>
               <Route path="/media" element={<Media />}/>
               <Route path="/media-photo" element={<MediaPhotoPage />} />
               <Route path="/media-video" element={<MediaVideoPage />} />
               <Route path="/events" element={<Events />}/>
               <Route path="/events/:slug" element={<Events />}/>
               <Route path="/portfolio" element={<Portfolio />}/>
               <Route path="/blog" element={<Blog />}/>
               <Route path="/contact" element={<Contact />}/>
               <Route path="/login" element={<LoginPage />} />
               <Route path="/reset-password" element={<ResetPassword />} />
               <Route path="/admin" element={<AdminPage />} />
               <Route path="/user" element={<UserPage />} />
        </Routes>
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
function App() {
  return (
    <BrowseRouter>
      <AppContent />
    </BrowseRouter>
  );
}
export default App
