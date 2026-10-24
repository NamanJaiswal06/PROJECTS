// async function showWeather() {
//     try{
//          let city = "goa";

//     const response = await fetch(
//         `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=e4bf4a99c41d99fb7dd1f7c5a64f72b4&units=metric`
//     );

//     const data = await response.json();

//     // console.log("weather data:", data);

//     // let newPara = document.createElement('p');
//     // newPara.textContent = `${data.main.temp.toFixed(2)} °C`;
//     // document.body.appendChild(newPara);


//     renderWeatherInfo(data); //data ko ui pe dikhata hai
// }

    
//     catch(e){
        
        


//     }
// }


// async function getCustomWeatherDetails(){
//     try{
//           let lat = 15.6333;
//     let lon = 18.3333;

//     let result = await fetch(
//         `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=e4bf4a99c41d99fb7dd1f7c5a64f72b4&units=metric`
//     );

//     let data = await result.json();
//     console.log(data);

//     }
//     catch(err){
//         console.log("error found" , err);
//     }
  
// }


const userTab = document.querySelector("[data-userWeather]");
const searchTab = document.querySelector("[data-searchWeather]");
const userContainer = document.querySelector(".weather-container");

const grantAccessContainer = document.querySelector(".grant-location-container");
const searchForm = document.querySelector("[data-searchForm]");
const loadingScreen = document.querySelector(".loading-container");
const userInfoContainer = document.querySelector(".user-info-container");

let currentTab = userTab;
const API_KEY = "e4bf4a99c41d99fb7dd1f7c5a64f72b4";
currentTab.classList.add("current-tab");
getfromSessionStorage();

userTab.addEventListener("click" , ()=>{
    //pass clicked tab as input parameter;
    switchTab(userTab);
});

searchTab.addEventListener("click" , ()=>{
    switchTab(searchTab);
});

function switchTab(clickedTab){
    if(clickedTab !=currentTab){
        currentTab.classList.remove("current-tab");
        currentTab = clickedTab;
         currentTab.classList.add("current-tab");

    }
    if(!searchForm.classList.contains("active")){
        userInfoContainer.classList.remove("active");
        grantAccessContainer.classList.remove("active");
        searchForm.classList.add("active");
    }
    else{
        searchForm.classList.remove("active");
        userInfoContainer.classList.remove("active");
        getfromSessionStorage();


    }
}

//checks if coordinates arw already present in storage
function getfromSessionStorage(){
    const localCoordinates = sessionStorage.getItem("user-coordinates");
    if(!localCoordinates){
        grantAccessContainer.classList.add("active");

    }
    else{
        const coordinates = JSON.parse(localCoordinates);
        fetchUserWeatherInfo(coordinates);
    }

}

async function  fetchUserWeatherInfo(coordinates){
    const {lat , lon} = coordinates;
    //make grant container invisible
    grantAccessContainer.classList.remove("active");
    //make loader
    loadingScreen.classList.add("active");

    //APPi call

    try{
        const response= await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=e4bf4a99c41d99fb7dd1f7c5a64f72b4&units=metric`);
        const data = await response.json();
        loadingScreen.classList.remove("active");
        userInfoContainer.classList.add("active");
        renderWeatherInfo(data);


    }
    catch(err){
        loadingScreen.classList.remove("active");

    }
}
function  renderWeatherInfo(weatherInfo){
    
    //firstly we have to fetch the element

    const cityName = document.querySelector("[data-cityName]");
    const countryIcon = document.querySelector("[data-countryIcon]");
    const desc = document.querySelector("[data-weatherDesc]");
    const weatherIcon = document.querySelector("[data-weatherIcon]");
    const temp = document.querySelector("[data-temp]");
    const windspeed = document.querySelector("[data-windspeed]");
    const cloudiness = document.querySelector("[data-cloudiness]");
    const humidity = document.querySelector("[data-humidity]");

    cityName.innerText = weatherInfo?.name;
    countryIcon.src = `https://flagdn.com/144x108/${weatherInfo?.sys?.country.toLowerCase()}.png` ;
    desc.innerText = weatherInfo?.weather?.[0]?.description;
   weatherIcon.src=`https://openweathermap.org/img/wn/${weatherInfo?.weather?.[0]?.icon}@2x.png`;

    temp.innerText =  `${weatherInfo?.main?.temp} °C`;
    windspeed.innerText = weatherInfo?.wind?.speed;
    humidity.innerText = weatherInfo?.main?.humidity;
    cloudiness.innerText = weatherInfo?.clouds?.all;




}

const grantAccessbutton = document.querySelector("[data-grantAccess]");

grantAccessbutton.addEventListener("click" , getLocation);

function getLocation() {
    if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(showPosition);

    }
    else{

    }
}
function showPosition(position){
    const userCoordinates = {
        lat: position.coords.latitude,
        lon:position.coords.longitude,
    }
    sessionStorage.setItem("user-coordinates" , JSON.stringify(userCoordinates));
    fetchUserWeatherInfo(userCoordinates);
}

const searchInput = document.querySelector("[data-searchInput]");

searchForm.addEventListener("submit" , (e)=>{
        e.preventDefault();
        let cityName = searchInput.value;
        if(cityName===""){
            return;
        }
        else{
            fetchSearchWeatherInfo(cityName);
        }
})

async function fetchSearchWeatherInfo(city){

    loadingScreen.classList.add("active");
    userInfoContainer.classList.remove("active");
    grantAccessContainer.classList.remove("active");

    try{
       

    const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=e4bf4a99c41d99fb7dd1f7c5a64f72b4&units=metric`
    );

    const data = await response.json();

    loadingScreen.classList.remove("active");
    userInfoContainer.classList.add("active");
    renderWeatherInfo(data);
    }
    catch(err){

    }

}



   


























































