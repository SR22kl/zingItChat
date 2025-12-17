import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import useThemeStore from "../store/themeStore";
import useUserStore from "../store/useUserStore";
import useLayoutStore from "../store/layoutStore";
import { RiChatSmileAiLine } from "react-icons/ri";
import { HiOutlineStatusOnline } from "react-icons/hi";
import { FaUserNinja } from "react-icons/fa";
import { motion } from "framer-motion";
import { IoSettingsOutline } from "react-icons/io5";

const Sidebar = () => {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { theme, setTheme } = useThemeStore();
  const { user } = useUserStore();
  const { activeTab, setActiveTab, selectedContact } = useLayoutStore();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (location.pathname === "/") {
      setActiveTab("chats");
    } else if (location.pathname === "/user-profile") {
      setActiveTab("profile");
    } else if (location.pathname === "/status") {
      setActiveTab("status");
    } else if (location.pathname === "/settings") {
      setActiveTab("settings");
    }
  }, [location, setActiveTab]);

  if (isMobile && selectedContact) {
    return null;
  }

  const SidebarContent = (
    <>
      <Link
        to="/"
        className={`${isMobile ? "" : "mb-8"} ${
          activeTab === "chats" && "bg-purple-500 shadow-md rounded-full"
        } p-2 hover:bg-purple-600 rounded-full transition duration-300 ease-in-out focus:outline-none`}
      >
        <RiChatSmileAiLine
          className={`w-6 h-6 ${
            activeTab === "chats"
              ? theme === "dark"
                ? "text-gray-800"
                : ""
              : theme === "dark"
              ? "text-gray-400"
              : "text-gray-800"
          }`}
        />
      </Link>
      <Link
        to="/status"
        className={`${isMobile ? "" : "mb-8"} ${
          activeTab === "status" && "bg-purple-400 shadow-md rounded-full"
        } p-2 hover:bg-purple-600 transition duration-300 ease-in-out rounded-full focus:outline-none `}
      >
        <HiOutlineStatusOnline
          className={`w-6 h-6 ${
            activeTab === "status"
              ? theme === "dark"
                ? "text-gray-800"
                : ""
              : theme === "dark"
              ? "text-gray-400"
              : "text-gray-800"
          }`}
        />
      </Link>
      {!isMobile && <div className=" grow" />}

      <Link
        to="/user-profile"
        className={`${isMobile ? "" : "mb-8"} ${
          activeTab === "user-profile" && "bg-purple-400 shadow-md rounded-full"
        } p-2 hover:bg-purple-600 transition duration-300 ease-in-out rounded-full focus:outline-none `}
      >
        {user?.profilePicture ? (
          <img
            src={user?.profilePicture}
            alt="user"
            className="w-6 h-6 rounded-full"
          />
        ) : (
          <FaUserNinja
            className={`w-6 h-6 ${
              activeTab === "profile"
                ? theme === "dark"
                  ? "text-gray-800"
                  : ""
                : theme === "dark"
                ? "text-gray-400"
                : "text-gray-800"
            }`}
          />
        )}
      </Link>
     <Link
        to="/settings"
        className={`${isMobile ? "" : "mb-8"} ${
          activeTab === "settings" && "bg-purple-500 shadow-md rounded-full"
        } p-2 hover:bg-purple-600 rounded-full transition duration-300 ease-in-out focus:outline-none`}
      >
        <IoSettingsOutline
          className={`w-6 h-6 ${
            activeTab === "settings"
              ? theme === "dark"
                ? "text-gray-800"
                : ""
              : theme === "dark"
              ? "text-gray-400"
              : "text-gray-800"
          }`}
        />
      </Link>
    </>
  );
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`${
          isMobile
            ? "fixed bottom-0 left-0 right-0 h-16"
            : "w-16 h-screen border-r-2 shadow-lg"
        } ${
          theme === "dark"
            ? "bg-gray-900 border-gray-600"
            : "bg-[rgb(239,242,254)] border-gray-300"
        } opacity-50 flex items-center py-4 shadow-lg ${
          isMobile ? "flex-row justify-around" : "flex-col justify-between"
        }`}
      >
        {SidebarContent}
      </motion.div>
    </>
  );
};

export default Sidebar;
