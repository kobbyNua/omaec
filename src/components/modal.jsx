

function Modal({isOpen,OnClose,children}){

     return (<>
     
           <div className="modal">
               
                 <div className="modal-container">
                           {children}
                 </div>
           </div>
     </>);
}