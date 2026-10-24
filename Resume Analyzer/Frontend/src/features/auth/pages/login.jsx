import React, { useState } from 'react'
import '../auth.form.scss'
import { useNavigate , Link } from 'react-router'
import { useAuth } from '../hooks/useAuth'
const login = () => {
    const navigate = useNavigate();
    const {handleLogin , loading} = useAuth()

    const [email, setemail] = useState("")
    const [password, setpassword] = useState("")
    const handleSubmit =async (e)=>{
        e.preventDefault();
      await handleLogin({email,password})
      navigate('/')
      
    }

    if(loading){
        return (<main><h1>Loading..................</h1></main>)
    }
    return (
        <main>
           <div className='form-container'>
            <h1>Log in</h1>
            <form onSubmit={handleSubmit}> 
            <div className="input-group">
                <label htmlFor="email">Email</label>
                <input onChange={
                (e)=>{setemail(e.target.value)}
                } type="text" name="email" id="email" placeholder='Enter Email Address'/>
            </div>
            <div className="input-group">
                <label htmlFor="password">Password</label>
                <input onChange={
                    (e)=>{setpassword(e.target.value)}
                } type="password" name="password" id="password" placeholder='Enter Password'/>
            </div>
            <button className='
            button  primary-button'>LogIn</button>
            </form>
            <p>Don't have an account? <Link to="/register">Register</Link></p>
            
           </div>

        </main>
    )
}

export default login