// import React from 'react';
// import SwiperCore, { Autoplay, Navigation, Pagination } from 'swiper';
// import { Swiper, SwiperSlide } from 'swiper/react';
// import 'swiper/swiper-bundle.min.css';
// import { AppBar, Toolbar, Button, Typography } from '@mui/material';
// import { ArrowBackIos, ArrowForwardIos } from '@mui/icons-material';
// import './Home.css';
// import slide_07 from './assets/slide-07.jpg';
// import slide_08 from './assets/slide-08.jpg';
// import slide_09 from './assets/slide-09.jpg';
// import slide_10 from './assets/slide-10.jpg';
// import slide_11 from './assets/slide-11.jpg';

// SwiperCore.use([Autoplay, Navigation, Pagination]);

// const Home = () => {
//   return (
//     <div className="home-container">
//       <AppBar position="static" className="navigation-bar">
//         <Toolbar>
//           <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
//             Proctorise
//           </Typography>
//           <Button variant="contained" color="primary" startIcon={<GoogleIcon />} className="google-login-button">
//             Login with Google
//           </Button>
//         </Toolbar>
//       </AppBar>
//       <div className="swiper-container">
//         <Swiper
//           autoplay={{ delay: 2000 }}
//           navigation
//           pagination={{ dynamicBullets: true }}
//           className="swiper-wrapper"
//         >
//           <SwiperSlide>
//             <img src={slide_07} alt="" />
//             <div className="swiper-slide-content">
//               <div className="swiper-slide-title">Milky Way</div>
//             </div>
//           </SwiperSlide>
//           <SwiperSlide>
//             <img src={slide_07} alt="" />
//             <div className="swiper-slide-content">
//               <div className="swiper-slide-title">Milky Way</div>
//             </div>
//           </SwiperSlide>
//           <SwiperSlide>
//             <img src={slide_08} alt="" />
//             <div className="swiper-slide-content">
//               <div className="swiper-slide-title">Milky Way</div>
//             </div>
//           </SwiperSlide>
//           <SwiperSlide>
//             <img src={slide_09} alt="" />
//             <div className="swiper-slide-content">
//               <div className="swiper-slide-title">Milky Way</div>
//             </div>
//           </SwiperSlide>
//           <SwiperSlide>
//             <img src={slide_10} alt="" />
//             <div className="swiper-slide-content">
//               <div className="swiper-slide-title">Milky Way</div>
//             </div>
//           </SwiperSlide>
//           <SwiperSlide>
//             <img src={slide_11} alt="" />
//             <div className="swiper-slide-content">
//               <div className="swiper-slide-title">Milky Way</div>
//             </div>
//           </SwiperSlide>
//         </Swiper>
//       </div>
//     </div>
//   );
// };

// export default Home;

// function GoogleIcon() {
//   return (
//     <svg
//       xmlns="http://www.w3.org/2000/svg"
//       enable-background="new 0 0 24 24"
//       height="24px"
//       viewBox="0 0 24 24"
//       width="24px"
//       fill="#000000"
//     >
//       <rect fill="none" height="24" width="24" />
//       <path d="M20.61,12.4c0,1.38-0.12,2.5-0.36,3.46H12V8.54h5.34C20.11,9.9,20.61,11.14,20.61,12.4z" opacity=".3" />
//       <path d="M12,4C9.52,4,7.45,5.33,6.16,7H3v4h3.16c0.93,1.67,2.76,3,5.03,3c1.35,0,2.57-0.47,3.53-1.24c1.15-0.9,1.9-2.23,2.22-3.76 C18.39,7.59,15.5,4,12,4z" opacity=".3" />
//       <path d="M3,8l9,6l3-2l6,4c0.03-0.23,0.05-0.47,0.05-0.71C21,14.85,16.15,11,12,11c-0.87,0-1.71,0.17-2.49,0.47L9,9.61L3,8z" />
//       <path d="M12,13V11l-8,5v2C4.47,18,6.42,20,9,20c1.5,0,2.84-0.85,3.52-2.16l1.48-2.53l-1.4-0.81C11.64,15.5,11.33,16,11,16 C10.55,16,10.11,15.81,9.75,15.44l-0.86,1.47C9.63,17.41,10.73,18,12,18c2.75,0,5-2.24,5-5v-2l-4,2L12,13z" />
//     </svg>
//   );
// }
