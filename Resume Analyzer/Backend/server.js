require("dotenv").config()
const {connecttoDb} = require("./src/config/datbase")
const app = require("./src/app")

connecttoDb()

app.listen(3000 , () =>{
    console.log("Server is running on 3000")
})

