const express = require("express")
const app = express()

const database = require("./config/database")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const fileUpload = require("express-fileupload")

require("dotenv").config()

const PORT = process.env.PORT || 4000

//connect db
database.connect()

//middlewares
app.use(express.json())
app.use(cookieParser())
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
    })
)
app.use(
    fileUpload({
        useTempFiles:true,
        tempFileDir:"/tmp",
    })
)

//routes
const userRoutes = require("./routes/user")
const courseRoutes = require("./routes/course")
const paymentRoutes = require("./routes/payment")
const profileRoutes = require("./routes/profile")

app.use("/api/v1/auth" , userRoutes)
app.use("/api/v1/course" , courseRoutes)
app.use("/api/v1/payment" , paymentRoutes)
app.use("/api/v1/profile" , profileRoutes)

//default route
app.get("/" , (req , res)=>{
    return res.json({
        success:true,
        message:"Your server is up and running..."
    })
})

app.listen(PORT , ()=>{
    console.log(`App is running at port ${PORT}`)
})
