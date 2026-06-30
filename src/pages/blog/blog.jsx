import Banner from '../banner/banner';
import './blog.css';



function DefaultBlog(){
    return (<>
              <Banner>
                       <h2>Blog</h2>
            <h5>Insights, Updates, and Stories from Our Team</h5>
              </Banner>



    <div className="blog-content">
        <div className="container">
            <h2>Welcome to Our Blog</h2>
            <p>Stay updated with the latest news, insights, and stories from our team. Our blog covers a wide range of topics including industry trends, company updates, and expert advice.</p>
            <div className="blog-carousel">
                <div className="blog-carousel-item active">
                    <img src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" alt="Blog Banner 1" />
                    <div className="blog-carousel-caption">
                        <h3>Latest Industry Trends in 2024</h3>
                        <p>Discover the top trends shaping the industry this year and how they can impact your business.</p>
                    </div>
                </div>
                <div className="blog-carousel-item">
                    <img src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" alt="Blog Banner 2" />
                    <div className="blog-carousel-caption">
                        <h3>How to Maximize Your Marketing Efforts</h3>
                        <p>Learn effective strategies to boost your marketing campaigns and reach a wider audience.</p>
                    </div>
                </div>
                <div className="blog-carousel-item">
                    <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" alt="Blog Banner 3" />
                    <div className="blog-carousel-caption">
                        <h3>Behind the Scenes: A Day in Our Office</h3>
                        <p>Get an exclusive look at our company culture and meet the team that makes it all happen.</p>
                    </div>
                </div>
                <div className="blog-carousel-indicators">
                    <button className="active"></button>
                    <button></button>
                    <button></button>
                </div>
            </div>
            
            <div className="blog-posts">
                <div className="blog-post">
                    <img src="https://images.unsplash.com/photo-1499750310159-5b9887039e54?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Blog Post 1" />
                    <div className="blog-post-content">
                        <h3>Blog Post Title 1</h3>
                        <p>Date: June 10, 2024</p>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque sit amet accumsan arcu. Proin ac consequat arcu. Nullam euismod, nisi vel consectetur interdum, nisl nisi aliquet nunc, quis gravida nunc nisl quis nunc.</p>
                        <a href="#" className="read-more">Read More</a>
                    </div>
                </div>
                <div className="blog-post">
                    <img src="https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Blog Post 2" />
                    <div className="blog-post-content">
                        <h3>Blog Post Title 2</h3>
                        <p>Date: May 25, 2024</p>
                        <p>Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Donec sed odio dui. Cras justo odio, dapibus ac facilisis in, egestas eget quam. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor.</p>
                        <a href="#" className="read-more">Read More</a>
                    </div>
                </div>
                <div className="blog-post">
                    <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Blog Post 3" />
                    <div className="blog-post-content">
                        <h3>Blog Post Title 3</h3>
                        <p>Date: May 5, 2024</p>
                        <p>Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Aenean lacinia bibendum nulla sed consectetur. Sed posuere consectetur est at lobortis. Maecenas sed diam eget risus varius blandit sit amet non magna.</p>
                        <a href="#" className="read-more">Read More</a>
                    </div>
                </div>
            </div>
        </div>
    </div>

    </>)
}

function ActiveBlog(){

}
function Blog(){

         return (
             <>
                    <DefaultBlog />
             </>
         )
}

export default Blog;