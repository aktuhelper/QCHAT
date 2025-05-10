import React, { useContext, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { assets } from "../assets/assets.js";
import { AppContent } from "../context/AppContext";

const Home = () => {
  const { backendUrl, userdata, socket, isLoggedin, getUserData } = useContext(AppContent);
  const location = useLocation();
  const navigate = useNavigate();
  if (isLoggedin === undefined) {
    return <div className="flex justify-center items-center h-screen text-white">Loading...</div>;
  }
  
  const basePath = location.pathname === "/";
  const messages = ["Welcome to Qchatt", "Connect with People"];
  const [text, setText] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // 🔐 Redirect unverified users to /email-verify
  useEffect(() => {
    if (isLoggedin === false) {
      navigate("/login");
    } else if (
      isLoggedin &&
      userdata &&
      !userdata.isAccountverified &&
      !userdata.isGoogleAuthenticated
    ) {
      navigate("/email");
    }
  }, [isLoggedin, userdata]);
  

  useEffect(() => {
    const typingSpeed = isDeleting ? 50 : 50;
    const deleteSpeed = 40;
    const pauseTime = 2500;

    const handleTyping = () => {
      if (!isDeleting && charIndex < messages[messageIndex].length) {
        setText((prev) => prev + messages[messageIndex][charIndex]);
        setCharIndex((prev) => prev + 1);
      } else if (isDeleting && charIndex > 0) {
        setText((prev) => prev.slice(0, -1));
        setCharIndex((prev) => prev - 1);
      } else if (!isDeleting && charIndex === messages[messageIndex].length) {
        setTimeout(() => setIsDeleting(true), pauseTime);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setMessageIndex((prev) => (prev + 1) % messages.length);
      }
    };

    const typingInterval = setTimeout(handleTyping, isDeleting ? deleteSpeed : typingSpeed);

    return () => clearTimeout(typingInterval);
  }, [charIndex, isDeleting, messageIndex]);

  return (
    <div className="grid lg:grid-cols-[300px,1fr] h-screen max-h-screen">
      {/* Sidebar Section */}
      <section className={` ${basePath ? "block" : "hidden"} lg:block`}>
        <Sidebar />
      </section>

      {/* Main Content Section */}
      <section className={`${basePath ? "hidden" : "block"} w-full`}>
        <Outlet />
      </section>

      <div
        className={`justify-center items-center flex-col gap-2 hidden ${!basePath ? "hidden" : "lg:flex"}`}
      >
        <div className="relative">
          <img
            src={assets.chat_logo}
            width={200}
            alt="logo"
            className="animate-pendulum"
          />
        </div>
        <p className="text-lg mt-2 text-slate-200">
          Hi <span className="text-blue-500 font-extrabold text-2xl">{userdata?.name}</span>!{" "}
          <span className="typing-animation">{text}</span>
        </p>

        <button 
          onClick={() => navigate("/randomchat")} 
          className="mt-4 px-6 py-3 text-white font-bold rounded-lg bg-red-500 hover:bg-red-600 transition duration-300 shadow-lg"
        >
          Start Chat
        </button>
      </div>
    </div>
  );
};

export default Home;
